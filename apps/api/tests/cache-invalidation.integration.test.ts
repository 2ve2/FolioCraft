import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { newId, type Site } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
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
