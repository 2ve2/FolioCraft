import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { newId, type Site } from "@ichnara/contracts";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { cacheInvalidations } from "../src/db/schema/cache";
import { sites } from "../src/db/schema/site";
import { storage } from "../src/lib/storage";
import { assetService } from "../src/services/assets";
import {
	cacheInvalidationService,
	MAX_RETRY_ATTEMPTS,
	PENDING_SIGNAL_KEY,
	revalidationDelivery,
	withRevalidationDelivery,
} from "../src/services/cache-invalidation";
import { account, request, result } from "./helpers";

const users: string[] = [];
const siteIds: string[] = [];
afterAll(async () => {
	if (users.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, users));
		await db.delete(user).where(inArray(user.id, users));
	}
	if (siteIds.length)
		await db.delete(cacheInvalidations).where(inArray(cacheInvalidations.siteId, siteIds));
});

/** Creates real owned content without ever using a hosted database or provider. */
async function fixture(label: string) {
	const owner = await account(`cache-${label}`, users);
	let site = await result<Site>(
		await request("/api/sites", "POST", { slug: `cache-${newId()}`, locale: "en" }, owner.cookie),
	);
	siteIds.push(site.id);
	site = await result<Site>(
		await request(
			`/api/sites/${site.id}/draft`,
			"PUT",
			{
				revision: site.revision,
				draft: {
					...site.draft,
					profile: { ...site.draft.profile, name: "Published cache fixture", role: "Designer" },
				},
			},
			owner.cookie,
		),
	);
	return { owner, site };
}

/** Reads durable intent rather than relying on a mocked callback to claim persistence. */
async function intent(siteId: string) {
	return db.select().from(cacheInvalidations).where(eq(cacheInvalidations.siteId, siteId));
}

test("every publication, slug, moderation, native ban/removal path commits and immediately delivers invalidation", async () => {
	const { owner, site: initial } = await fixture("paths");
	let site = initial;
	const sent: { siteId: string; slug: string }[] = [];
	const send = async (item: { siteId: string; slug: string }) => {
		sent.push(item);
	};
	const mutate = (path: string, body?: unknown, cookie = owner.cookie, method = "POST") =>
		withRevalidationDelivery(send, () => request(path, method, body, cookie));
	const first = await result<{ id: string }>(
		await mutate(`/api/sites/${site.id}/releases`, { revision: site.revision }),
	);
	expect(sent).toEqual([{ siteId: site.id, slug: site.slug }]);
	const count = sent.length;
	site = await result<Site>(
		await mutate(
			`/api/sites/${site.id}/draft`,
			{
				revision: site.revision,
				draft: { ...site.draft, profile: { ...site.draft.profile, name: "Private next draft" } },
			},
			owner.cookie,
			"PUT",
		),
	);
	expect(sent.length).toBe(count);
	const second = await result<{ id: string }>(
		await mutate(`/api/sites/${site.id}/releases`, { revision: site.revision }),
	);
	expect(sent.length).toBe(count + 1);
	await result(
		await mutate(`/api/sites/${site.id}/releases/${first.id}/activate`, {
			expectedReleaseId: second.id,
		}),
	);
	expect(sent.length).toBe(count + 2);
	await result(await mutate(`/api/sites/${site.id}/unpublish`));
	expect(sent.length).toBe(count + 3);
	await result(await mutate(`/api/sites/${site.id}/releases`, { revision: site.revision }));
	const oldSlug = site.slug;
	site = await result<Site>(
		await mutate(
			`/api/sites/${site.id}`,
			{ revision: site.revision, slug: `changed-${newId()}` },
			owner.cookie,
			"PATCH",
		),
	);
	expect(
		sent
			.slice(-2)
			.map((entry) => entry.slug)
			.sort(),
	).toEqual([oldSlug, site.slug].sort());
	const staff = await account("cache-staff", users);
	await db.update(user).set({ role: "owner" }).where(eq(user.id, staff.id));
	const credentials = {
		password: staff.password,
		reason: "Synthetic cache invalidation verification",
	};
	for (const action of ["suspend", "resume"]) {
		const before = sent.length;
		await result(await mutate(`/api/admin/sites/${site.id}/${action}`, credentials, staff.cookie));
		expect(sent.length).toBe(before + 1);
	}
	for (const action of ["ban", "unban"]) {
		const before = sent.length;
		await result(await mutate(`/api/admin/users/${owner.id}/${action}`, credentials, staff.cookie));
		expect(sent.length).toBe(before + 1);
	}
	const beforeRemoval = sent.length;
	await result(
		await mutate(
			`/api/admin/users/${owner.id}/remove`,
			{ ...credentials, confirmation: owner.id },
			staff.cookie,
		),
	);
	expect(sent.length).toBe(beforeRemoval + 1);
	expect(await db.select().from(sites).where(eq(sites.id, site.id))).toHaveLength(0);
	expect((await intent(site.id)).every((row) => row.version === row.deliveredVersion)).toBe(true);
	expect((await intent(site.id)).map((row) => row.slug).sort()).toEqual(
		[oldSlug, site.slug].sort(),
	);
});

test("site and allowed asset removal survive cascades; rollback and rejected publication create no intent", async () => {
	const { owner, site } = await fixture("deletion");
	expect(
		(await request(`/api/sites/${site.id}/releases`, "POST", { revision: -1 }, owner.cookie))
			.status,
	).toBe(400);
	expect(await intent(site.id)).toHaveLength(0);
	await expect(
		db.transaction(async (tx) => {
			await tx.update(sites).set({ suspended: true }).where(eq(sites.id, site.id));
			throw new Error("SYNTHETIC_ROLLBACK");
		}),
	).rejects.toThrow("SYNTHETIC_ROLLBACK");
	expect(await intent(site.id)).toHaveLength(0);
	const assetId = newId();
	await db.insert(assets).values({
		id: assetId,
		siteId: site.id,
		uploaderId: owner.id,
		key: `verified/${site.id}/${assetId}`,
		stagingKey: `staging/${site.id}/${assetId}`,
		mime: "image/png",
		size: 10,
		status: "ready",
		expiresAt: new Date(Date.now() - 120000),
	});
	const configured = spyOn(storage, "assertConfigured").mockImplementation(() => {});
	const remove = spyOn(storage, "delete").mockResolvedValue(undefined);
	try {
		await assetService.delete(owner.id, site.id, assetId);
	} finally {
		configured.mockRestore();
		remove.mockRestore();
	}
	expect((await intent(site.id))[0].version).toBe(2);
	await db.delete(sites).where(eq(sites.id, site.id));
	expect((await intent(site.id))[0].version).toBe(3);
	expect((await intent(site.id))[0].slug).toBe(site.slug);
});

test("failed delivery persists, retry succeeds, and an older concurrent delivery cannot acknowledge a newer generation", async () => {
	const { site } = await fixture("retry");
	await db.update(sites).set({ suspended: true }).where(eq(sites.id, site.id));
	const logs = spyOn(console, "error").mockImplementation(() => {});
	try {
		const report = await cacheInvalidationService.flush(
			async () => {
				throw new Error("SYNTHETIC_UNAVAILABLE");
			},
			20,
			[site.id],
		);
		expect(report).toMatchObject({ failed: 1, delivered: 0 });
		expect(logs.mock.calls.flat()).toContain(
			JSON.stringify({ event: "cache_invalidation_failed" }),
		);
		expect((await intent(site.id))[0]).toMatchObject({
			version: 1,
			deliveredVersion: 0,
			attempts: 1,
		});
		await cacheInvalidationService.flush(
			async () => {
				await db.update(sites).set({ suspended: false }).where(eq(sites.id, site.id));
			},
			20,
			[site.id],
		);
		expect((await intent(site.id))[0]).toMatchObject({ version: 2, deliveredVersion: 0 });
		const retried = await cacheInvalidationService.flush(async () => {}, 20, [site.id]);
		expect(retried).toMatchObject({ delivered: 1, failed: 0 });
		expect((await intent(site.id))[0]).toMatchObject({
			version: 2,
			deliveredVersion: 2,
			attempts: 0,
		});
		expect(
			await cacheInvalidationService.flush(
				async () => {
					throw new Error("NOT_PENDING");
				},
				20,
				[site.id],
			),
		).toMatchObject({ delivered: 0, failed: 0 });
	} finally {
		logs.mockRestore();
	}
});

test("sender accepts only a completed 204 and uses the binding without exposing the secret", async () => {
	const item = { siteId: newId(), slug: "cache-sender" };
	for (const status of [200, 401, 503]) {
		const deliver = revalidationDelivery({
			PORTFOLIO_REVALIDATION_SECRET: "synthetic-only-at-least-32-characters",
			PORTFOLIO_REVALIDATION: {
				async fetch() {
					return new Response(null, { status });
				},
			},
		});
		await expect(deliver?.(item)).rejects.toThrow("CACHE_REVALIDATION_REJECTED");
	}
	const deliver = revalidationDelivery({
		PORTFOLIO_REVALIDATION_SECRET: "synthetic-only-at-least-32-characters",
		PORTFOLIO_REVALIDATION: {
			async fetch(message) {
				expect(new URL(message.url).pathname).toBe("/api/internal/revalidate-portfolio");
				expect(await message.json()).toMatchObject(item);
				return new Response(null, { status: 204 });
			},
		},
	});
	await deliver?.(item);
});

/** In-memory stand-in with R2's etag semantics: the etag follows the content, and a failed
 * onlyIf precondition writes nothing. */
function signalBucket() {
	const objects = new Map<string, { etag: string; customMetadata?: Record<string, string> }>();
	return {
		objects,
		async head(key: string) {
			return objects.get(key) ?? null;
		},
		async put(
			key: string,
			value: string,
			options?: { customMetadata?: Record<string, string>; onlyIf?: { etagMatches: string } },
		) {
			if (options?.onlyIf && objects.get(key)?.etag !== options.onlyIf.etagMatches) return null;
			const object = { etag: `content:${value}`, customMetadata: options?.customMetadata };
			objects.set(key, object);
			return object;
		},
	};
}
const secret = "synthetic-only-at-least-32-characters";
const accepting = {
	async fetch() {
		return new Response(null, { status: 204 });
	},
};
const state = (bucket: ReturnType<typeof signalBucket>) =>
	bucket.objects.get(PENDING_SIGNAL_KEY)?.customMetadata?.state;

test("minute retry reads only the R2 signal and opens no database scope while nothing failed", async () => {
	const bucket = signalBucket();
	let scopes = 0;
	const withDatabase = async <T>(operation: () => Promise<T>) => {
		scopes++;
		return operation();
	};
	const bindings = {
		PORTFOLIO_REVALIDATION_SECRET: secret,
		PORTFOLIO_REVALIDATION: accepting,
		PUBLIC_CACHE_SIGNAL: bucket,
	};
	expect(await cacheInvalidationService.retryPending(bindings, withDatabase)).toEqual({
		skipped: true,
	});
	await bucket.put(PENDING_SIGNAL_KEY, "", { customMetadata: { state: "clear" } });
	expect(await cacheInvalidationService.retryPending(bindings, withDatabase)).toEqual({
		skipped: true,
	});
	// Without the signal binding the minute trigger must not fall back to polling the database.
	expect(
		await cacheInvalidationService.retryPending(
			{ PORTFOLIO_REVALIDATION_SECRET: secret, PORTFOLIO_REVALIDATION: accepting },
			withDatabase,
		),
	).toEqual({ skipped: true });
	expect(scopes).toBe(0);
});

test("a failed delivery leaves a pending signal that the minute retry drains and clears", async () => {
	// Earlier suites leave undelivered rows in the disposable database; settle them first.
	await db.update(cacheInvalidations).set({ deliveredVersion: sql`${cacheInvalidations.version}` });
	const { site } = await fixture("signal");
	await db.update(sites).set({ suspended: true }).where(eq(sites.id, site.id));
	const bucket = signalBucket();
	const logs = spyOn(console, "error").mockImplementation(() => {});
	try {
		const failing = revalidationDelivery({
			PORTFOLIO_REVALIDATION_SECRET: secret,
			PORTFOLIO_REVALIDATION: {
				async fetch() {
					return new Response(null, { status: 503 });
				},
			},
			PUBLIC_CACHE_SIGNAL: bucket,
		});
		expect(await cacheInvalidationService.flush(failing, 20, [site.id])).toMatchObject({
			failed: 1,
		});
		expect(state(bucket)).toBe("pending");
		// Each mark must change the etag, or an older read could clear a newer failure.
		const firstMark = bucket.objects.get(PENDING_SIGNAL_KEY)?.etag;
		await cacheInvalidationService.flush(failing, 20, [site.id]);
		expect(bucket.objects.get(PENDING_SIGNAL_KEY)?.etag).not.toBe(firstMark);
		const recovered = {
			PORTFOLIO_REVALIDATION_SECRET: secret,
			PORTFOLIO_REVALIDATION: accepting,
			PUBLIC_CACHE_SIGNAL: bucket,
		};
		// Two failures back the intent off for four minutes: the retry waits and keeps the signal.
		expect(
			await cacheInvalidationService.retryPending(recovered, (operation) => operation()),
		).toMatchObject({ skipped: false, delivered: 0, failed: 0, remaining: true });
		expect(state(bucket)).toBe("pending");
		await db
			.update(cacheInvalidations)
			.set({ updatedAt: sql`now() - interval '5 minutes'` })
			.where(eq(cacheInvalidations.siteId, site.id));
		const retried = await cacheInvalidationService.retryPending(recovered, (operation) =>
			operation(),
		);
		expect(retried).toMatchObject({ skipped: false, delivered: 1, failed: 0, remaining: false });
		expect((await intent(site.id))[0]).toMatchObject({ version: 1, deliveredVersion: 1 });
		expect(state(bucket)).toBe("clear");
	} finally {
		logs.mockRestore();
	}
});

test("a failure recorded while the retry runs keeps the signal pending", async () => {
	await db.update(cacheInvalidations).set({ deliveredVersion: sql`${cacheInvalidations.version}` });
	const { site } = await fixture("signal-race");
	await db.update(sites).set({ suspended: true }).where(eq(sites.id, site.id));
	const bucket = signalBucket();
	await bucket.put(PENDING_SIGNAL_KEY, newId(), { customMetadata: { state: "pending" } });
	const retried = await cacheInvalidationService.retryPending(
		{
			PORTFOLIO_REVALIDATION_SECRET: secret,
			PUBLIC_CACHE_SIGNAL: bucket,
			PORTFOLIO_REVALIDATION: {
				async fetch() {
					// Another request's delivery fails at the same moment and re-marks the signal.
					await bucket.put(PENDING_SIGNAL_KEY, newId(), {
						customMetadata: { state: "pending" },
					});
					return new Response(null, { status: 204 });
				},
			},
		},
		(operation) => operation(),
	);
	expect(retried).toMatchObject({ skipped: false, delivered: 1, remaining: false });
	expect(state(bucket)).toBe("pending");
});

test("intents past the retry limit release the signal and wait for the daily backstop", async () => {
	await db.update(cacheInvalidations).set({ deliveredVersion: sql`${cacheInvalidations.version}` });
	const { site } = await fixture("signal-limit");
	await db.update(sites).set({ suspended: true }).where(eq(sites.id, site.id));
	await db
		.update(cacheInvalidations)
		.set({ attempts: MAX_RETRY_ATTEMPTS, updatedAt: sql`now() - interval '2 hours'` })
		.where(eq(cacheInvalidations.siteId, site.id));
	const bucket = signalBucket();
	await bucket.put(PENDING_SIGNAL_KEY, newId(), { customMetadata: { state: "pending" } });
	const bindings = {
		PORTFOLIO_REVALIDATION_SECRET: secret,
		PORTFOLIO_REVALIDATION: accepting,
		PUBLIC_CACHE_SIGNAL: bucket,
	};
	expect(
		await cacheInvalidationService.retryPending(bindings, (operation) => operation()),
	).toMatchObject({ delivered: 0, remaining: false });
	expect(state(bucket)).toBe("clear");
	// The daily backstop ignores the limit and still delivers it.
	expect(
		await cacheInvalidationService.flush(revalidationDelivery(bindings), 20, [site.id]),
	).toMatchObject({ delivered: 1 });
});

test("a target without a valid secret is disabled instead of failing every delivery", () => {
	const logs = spyOn(console, "error").mockImplementation(() => {});
	try {
		for (const value of [undefined, "too-short"])
			expect(
				revalidationDelivery({
					PORTFOLIO_REVALIDATION_SECRET: value,
					PORTFOLIO_REVALIDATION: accepting,
				}),
			).toBeUndefined();
		expect(logs.mock.calls.flat()).toContain(
			JSON.stringify({ event: "cache_revalidation_unconfigured" }),
		);
	} finally {
		logs.mockRestore();
	}
});
