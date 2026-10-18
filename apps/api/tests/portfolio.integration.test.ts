import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import type { Draft, PublicSite, Site } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
import app from "../src/app";
import { env } from "../src/config/env";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { releases, sites } from "../src/db/schema/site";

// This suite uses the configured real database and deletes only users it created.
// Keep the lifecycle sequential so every assertion observes a known draft revision.
const createdUsers: string[] = [];
const nonce = crypto.randomUUID().replaceAll("-", "");
const password = `Portfolio-${crypto.randomUUID()}`;

async function request(
	path: string,
	method = "GET",
	body?: unknown,
	cookie?: string,
	origin = env.WEB_URL,
) {
	return app.request(new URL(path, env.API_URL).href, {
		method,
		headers: {
			Origin: origin,
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
			...(cookie ? { Cookie: cookie } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

async function result<T>(response: Response, status = 200): Promise<T> {
	expect(response.status).toBe(status);
	const envelope = (await response.json()) as { status: boolean; result: T };
	expect(envelope.status).toBe(true);
	return envelope.result;
}

function authCookie(response: Response) {
	const values = response.headers.getSetCookie();
	const cookie = values.map((value) => value.split(";")[0]).join("; ");
	expect(cookie).toContain("session_token=");
	return cookie;
}

async function signUp(label: string) {
	const email = `folio-test-${label}-${nonce}@example.com`;
	const response = await request("/api/auth/sign-up/email", "POST", {
		name: `Integration ${label}`,
		email,
		password,
	});
	expect(response.status).toBe(200);
	const body = (await response.json()) as { user: { id: string } };
	createdUsers.push(body.user.id);
	return { id: body.user.id, email, cookie: authCookie(response) };
}

afterAll(async () => {
	if (createdUsers.length) await db.delete(user).where(inArray(user.id, createdUsers));
});

test("real auth, owned drafts, transactional releases and persistence", async () => {
	const owner = await signUp("owner");
	const other = await signUp("other");
	const slug = `test-${nonce}`;
	expect(
		await result<Site | null>(await request("/api/sites", "GET", undefined, owner.cookie)),
	).toBeNull();
	let site = await result<Site>(
		await request("/api/sites", "POST", { slug, locale: "ar" }, owner.cookie),
	);
	await result<Site>(
		await request("/api/sites", "POST", { slug: `other-${nonce}`, locale: "en" }, other.cookie),
	);
	const base = `/api/sites/${site.id}`;
	const publicPath = `/api/public/sites/${slug}`;
	expect((await request(publicPath)).status).toBe(404);
	expect((await request(`${base}/preview`)).status).toBe(401);
	expect((await request("/api/sites")).status).toBe(401);

	const draft: Draft = {
		...site.draft,
		profile: {
			name: "مصمم الاختبار",
			role: "Product Designer",
			bio: "نبذة عربية ومحتوى English",
			location: "الرياض",
			email: "portfolio@example.com",
			website: "https://example.com",
			available: true,
		},
		projects: [
			{
				id: crypto.randomUUID(),
				title: "مشروع حقيقي",
				summary: "Case study",
				body: "تفاصيل المشروع",
				role: "Designer",
				year: "2026",
				tools: "Figma",
				url: "https://example.com/project",
			},
		],
	};
	const initialRevision = site.revision;
	for (const [suffix, method, body] of [
		["/preview", "GET", undefined],
		["/draft", "PUT", { revision: initialRevision, draft }],
		["/releases", "POST", { revision: initialRevision }],
		["/unpublish", "POST", undefined],
	] as const) {
		expect((await request(`${base}${suffix}`, method, body, other.cookie)).status).toBe(404);
		expect((await request(`${base}${suffix}`, method, body)).status).toBe(401);
	}
	site = await result<Site>(
		await request(`${base}/draft`, "PUT", { revision: site.revision, draft }, owner.cookie),
	);
	expect(site.revision).toBe(initialRevision + 1);
	expect(
		(await request(`${base}/draft`, "PUT", { revision: initialRevision, draft }, owner.cookie))
			.status,
	).toBe(409);
	expect((await request(publicPath)).status).toBe(404);

	const saved = await result<Site>(
		await request(`${base}/preview`, "GET", undefined, owner.cookie),
	);
	expect(saved.draft).toEqual(draft);
	const content = JSON.stringify({ profile: saved.draft.profile, projects: saved.draft.projects });
	const themed: Draft = {
		...saved.draft,
		appearance: {
			...saved.draft.appearance,
			theme: "dark",
			font: "serif",
			size: "large",
			accent: "green",
		},
	};
	site = await result<Site>(
		await request(`${base}/draft`, "PUT", { revision: site.revision, draft: themed }, owner.cookie),
	);
	expect(JSON.stringify({ profile: site.draft.profile, projects: site.draft.projects })).toBe(
		content,
	);

	// Both requests publish the same revision concurrently; the unique release is reused.
	const publications = await Promise.all([
		request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
		request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
	]);
	for (const publication of publications) await result<unknown>(publication);
	const firstRelease = await result<PublicSite>(await request(publicPath));
	expect(firstRelease.draft).toEqual(themed);
	await result<unknown>(
		await request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
	);
	expect((await result<PublicSite>(await request(publicPath))).releaseId).toBe(
		firstRelease.releaseId,
	);
	const storedReleases = await db.select().from(releases).where(eq(releases.siteId, site.id));
	expect(storedReleases).toHaveLength(1);

	const changedDraft = { ...themed, profile: { ...themed.profile, bio: "مسودة جديدة غير منشورة" } };
	site = await result<Site>(
		await request(
			`${base}/draft`,
			"PUT",
			{ revision: site.revision, draft: changedDraft },
			owner.cookie,
		),
	);
	expect(await result<PublicSite>(await request(publicPath))).toEqual(firstRelease);
	expect(
		(await request(`${base}/releases`, "POST", { revision: site.revision - 1 }, owner.cookie))
			.status,
	).toBe(409);
	for (const invalidUrl of ["javascript:alert(1)", "data:text/html,bad", "file:///etc/passwd"]) {
		const invalid = { ...changedDraft, profile: { ...changedDraft.profile, website: invalidUrl } };
		expect(
			(
				await request(
					`${base}/draft`,
					"PUT",
					{ revision: site.revision, draft: invalid },
					owner.cookie,
				)
			).status,
		).toBe(400);
	}
	expect(
		(
			await request(
				`${base}/draft`,
				"PUT",
				{ revision: site.revision, draft: changedDraft },
				owner.cookie,
				"https://untrusted.example",
			)
		).status,
	).toBe(403);

	// Exercise a real driver transaction; throwing must roll back the temporary update.
	const rollbackMarker = new Error("integration rollback marker");
	await expect(
		db.transaction(async (tx) => {
			await tx
				.update(sites)
				.set({ revision: site.revision + 100 })
				.where(eq(sites.id, site.id));
			throw rollbackMarker;
		}),
	).rejects.toThrow("integration rollback marker");
	expect(
		(await result<Site>(await request(`${base}/preview`, "GET", undefined, owner.cookie))).revision,
	).toBe(site.revision);

	const oldCookie = owner.cookie;
	expect((await request("/api/auth/sign-out", "POST", {}, oldCookie)).status).toBe(200);
	expect((await request(`${base}/preview`, "GET", undefined, oldCookie)).status).toBe(401);
	const login = await request("/api/auth/sign-in/email", "POST", { email: owner.email, password });
	expect(login.status).toBe(200);
	owner.cookie = authCookie(login);
	const restored = await result<Site>(await request("/api/sites", "GET", undefined, owner.cookie));
	expect(restored.id).toBe(site.id);
	expect(restored.draft).toEqual(changedDraft);
	expect(await result<PublicSite>(await request(publicPath))).toEqual(firstRelease);
	await result<unknown>(await request(`${base}/unpublish`, "POST", undefined, owner.cookie));
	expect((await request(publicPath)).status).toBe(404);
	expect(
		(await result<Site>(await request(`${base}/preview`, "GET", undefined, owner.cookie))).draft,
	).toEqual(changedDraft);
}, 120_000);
