import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import type { Article, PublicSite, Site } from "@folio/contracts";
import { eq, inArray } from "drizzle-orm";
import app from "../src/app";
import { env } from "../src/config/env";
import { db } from "../src/db";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { releases, sites } from "../src/db/schema/site";
import { account, error, request, result } from "./helpers";

const users: string[] = [];
const bucketKeys: string[] = [];
afterAll(async () => {
	if (users.length) await db.delete(user).where(inArray(user.id, users));
	if (bucketKeys.length) await db.delete(rateBuckets).where(inArray(rateBuckets.key, bucketKeys));
});

test("owned content CRUD, publication history/CAS, inquiries and unavailable integrations", async () => {
	const owner = await account("product-owner", users);
	const other = await account("product-other", users);
	const slug = `product-${crypto.randomUUID().replaceAll("-", "")}`;
	let site = await result<Site>(
		await request("/api/sites", "POST", { slug, locale: "ar" }, owner.cookie),
	);
	const otherSite = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `other-${crypto.randomUUID().replaceAll("-", "")}`, locale: "en" },
			other.cookie,
		),
	);
	const base = `/api/sites/${site.id}`;
	const me = await result<{ id: string; email: string }>(
		await request("/api/me", "GET", undefined, owner.cookie),
	);
	expect(me.id).toBe(owner.id);
	expect(me.email).toBe(owner.email);
	await error(await request("/api/me"), 401);
	const badJSON = await app.request(new URL(`${base}/profile`, env.API_URL).href, {
		method: "PATCH",
		headers: { Origin: env.WEB_URL, Cookie: owner.cookie, "Content-Type": "application/json" },
		body: "{broken",
	});
	await error(badJSON, 400, "INVALID_JSON");
	await error(
		await request(
			`${base}/profile`,
			"PATCH",
			{ revision: site.revision, profile: {} },
			owner.cookie,
		),
		400,
	);
	site = await result<Site>(
		await request(
			`${base}/profile`,
			"PATCH",
			{
				revision: site.revision,
				profile: { name: "مصمم", role: "Designer", email: "contact@example.com" },
			},
			owner.cookie,
		),
	);

	const sampleCollections = [
		[
			"projects",
			{
				title: "Project",
				summary: "Summary",
				body: "Details",
				role: "Designer",
				year: "2026",
				tools: "Figma",
				url: "https://example.com",
			},
			"title",
		],
		[
			"experiences",
			{
				organization: "Studio",
				role: "Designer",
				startDate: "2025-01-01",
				endDate: null,
				current: true,
				description: "Worked here",
			},
			"organization",
		],
		[
			"education",
			{
				organization: "University",
				qualification: "Design",
				startDate: "2020-01-01",
				endDate: "2024-01-01",
				description: "Studied here",
				verificationUrl: "https://example.com",
			},
			"organization",
		],
		["skills", { category: "Design", items: ["UI", "UX"] }, "category"],
	] as const;
	for (const [collection, fields, editable] of sampleCollections) {
		const first = { id: crypto.randomUUID(), ...fields };
		const second = { id: crypto.randomUUID(), ...fields };
		for (const cookie of [undefined, other.cookie]) {
			const status = cookie ? 404 : 401;
			await error(await request(`${base}/${collection}`, "GET", undefined, cookie), status);
			await error(
				await request(
					`${base}/${collection}`,
					"POST",
					{ revision: site.revision, item: first },
					cookie,
				),
				status,
			);
			await error(
				await request(
					`${base}/${collection}/${first.id}`,
					"PATCH",
					{ revision: site.revision, item: { [editable]: "changed" } },
					cookie,
				),
				status,
			);
			await error(
				await request(
					`${base}/${collection}/${first.id}`,
					"DELETE",
					{ revision: site.revision },
					cookie,
				),
				status,
			);
			await error(
				await request(
					`${base}/${collection}/reorder`,
					"POST",
					{ revision: site.revision, ids: [] },
					cookie,
				),
				status,
			);
		}
		site = await result<Site>(
			await request(
				`${base}/${collection}`,
				"POST",
				{ revision: site.revision, item: first },
				owner.cookie,
			),
		);
		await error(
			await request(
				`${base}/${collection}`,
				"POST",
				{ revision: site.revision, item: first },
				owner.cookie,
			),
			409,
			"ITEM_EXISTS",
		);
		site = await result<Site>(
			await request(
				`${base}/${collection}`,
				"POST",
				{ revision: site.revision, item: second },
				owner.cookie,
			),
		);
		const revisionBeforePatch = site.revision;
		site = await result<Site>(
			await request(
				`${base}/${collection}/${first.id}`,
				"PATCH",
				{ revision: site.revision, item: { [editable]: "Updated" } },
				owner.cookie,
			),
		);
		await error(
			await request(
				`${base}/${collection}/${first.id}`,
				"PATCH",
				{ revision: revisionBeforePatch, item: { [editable]: "Stale" } },
				owner.cookie,
			),
			409,
			"REVISION_CONFLICT",
		);
		const item = await result<{ item: Record<string, unknown> }>(
			await request(`${base}/${collection}/${first.id}`, "GET", undefined, owner.cookie),
		);
		expect(item.item[editable]).toBe("Updated");
		for (const ids of [[first.id], [first.id, first.id], [first.id, crypto.randomUUID()]]) {
			await error(
				await request(
					`${base}/${collection}/reorder`,
					"POST",
					{ revision: site.revision, ids },
					owner.cookie,
				),
				400,
				"INVALID_ORDER",
			);
		}
		site = await result<Site>(
			await request(
				`${base}/${collection}/reorder`,
				"POST",
				{ revision: site.revision, ids: [second.id, first.id] },
				owner.cookie,
			),
		);
		const listing = await result<{ items: { id: string }[] }>(
			await request(`${base}/${collection}`, "GET", undefined, owner.cookie),
		);
		expect(listing.items.map((value) => value.id)).toEqual([second.id, first.id]);
		site = await result<Site>(
			await request(
				`${base}/${collection}/${second.id}`,
				"DELETE",
				{ revision: site.revision },
				owner.cookie,
			),
		);
		await error(
			await request(`${base}/${collection}/${second.id}`, "GET", undefined, owner.cookie),
			404,
		);
	}

	const article = {
		id: crypto.randomUUID(),
		slug: "visible-article",
		title: "مقال منشور",
		summary: "ملخص",
		body: "word ".repeat(401),
		published: true,
		richBody: [{ type: "paragraph", text: "word ".repeat(401) }],
	};
	const privateArticle = {
		...article,
		id: crypto.randomUUID(),
		slug: "private-article",
		published: false,
	};
	for (const cookie of [undefined, other.cookie]) {
		const status = cookie ? 404 : 401;
		await error(await request(`${base}/articles`, "GET", undefined, cookie), status);
		await error(
			await request(`${base}/articles`, "POST", { revision: site.revision, item: article }, cookie),
			status,
		);
		await error(
			await request(
				`${base}/articles/${article.id}`,
				"PATCH",
				{ revision: site.revision, item: { title: "Changed" } },
				cookie,
			),
			status,
		);
		await error(
			await request(
				`${base}/articles/${article.id}`,
				"DELETE",
				{ revision: site.revision },
				cookie,
			),
			status,
		);
		await error(
			await request(
				`${base}/articles/reorder`,
				"POST",
				{ revision: site.revision, ids: [] },
				cookie,
			),
			status,
		);
	}
	for (const item of [article, privateArticle])
		site = await result<Site>(
			await request(`${base}/articles`, "POST", { revision: site.revision, item }, owner.cookie),
		);
	expect(site.draft.articles?.[0].readTimeMinutes).toBe(3);
	// Older whole-draft clients must preserve newer collections/visibility while toggling projects.
	site = await result<Site>(
		await request(
			`${base}/sections`,
			"PATCH",
			{ revision: site.revision, sections: { projects: false, skills: false } },
			owner.cookie,
		),
	);
	const preservedArticles = JSON.stringify(site.draft.articles);
	const legacy = {
		schemaVersion: site.draft.schemaVersion,
		locale: site.draft.locale,
		profile: site.draft.profile,
		projects: site.draft.projects,
		appearance: { ...site.draft.appearance, projectsVisible: true },
	};
	site = await result<Site>(
		await request(`${base}/draft`, "PUT", { revision: site.revision, draft: legacy }, owner.cookie),
	);
	expect(site.draft.sectionVisibility).toEqual({ projects: true, skills: false });
	expect(JSON.stringify(site.draft.articles)).toBe(preservedArticles);
	expect(site.draft.experiences).toHaveLength(1);
	const collisionId = crypto.randomUUID();
	site = await result<Site>(
		await request(
			`${base}/projects/${site.draft.projects[0].id}`,
			"PATCH",
			{ revision: site.revision, item: { slug: collisionId } },
			owner.cookie,
		),
	);
	site = await result<Site>(
		await request(
			`${base}/projects`,
			"POST",
			{
				revision: site.revision,
				item: {
					...site.draft.projects[0],
					id: collisionId,
					slug: "exact-id-project",
					title: "Exact ID wins",
				},
			},
			owner.cookie,
		),
	);
	await error(
		await request(
			`${base}/articles/${article.id}`,
			"PATCH",
			{ revision: site.revision, item: { readTimeMinutes: 999 } },
			owner.cookie,
		),
		400,
	);
	await error(
		await request(
			`${base}/articles/${article.id}`,
			"PATCH",
			{
				revision: site.revision,
				item: { richBody: [{ type: "html", html: "<script>alert(1)</script>" }] },
			},
			owner.cookie,
		),
		400,
	);
	const contentBeforeTheme = JSON.stringify({ ...site.draft, appearance: undefined });
	site = await result<Site>(
		await request(
			`${base}/appearance`,
			"PATCH",
			{ revision: site.revision, appearance: { theme: "editorial", font: "mono" } },
			owner.cookie,
		),
	);
	expect(JSON.stringify({ ...site.draft, appearance: undefined })).toBe(contentBeforeTheme);
	await error(
		await request(base, "PATCH", { revision: site.revision, slug: otherSite.slug }, owner.cookie),
		409,
	);
	expect(
		(await result<Site>(await request(`${base}/preview`, "GET", undefined, owner.cookie))).revision,
	).toBe(site.revision);
	site = await result<Site>(
		await request(base, "PATCH", { revision: site.revision, locale: "en" }, owner.cookie),
	);
	await error(
		await request(base, "PATCH", { revision: site.revision - 1, locale: "ar" }, owner.cookie),
		409,
		"REVISION_CONFLICT",
	);
	const first = await result<{ id: string; revision: number }>(
		await request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
	);
	await expect(
		db
			.update(releases)
			.set({ revision: first.revision + 999 })
			.where(eq(releases.id, first.id))
			.execute(),
	).rejects.toMatchObject({ cause: { code: "23514" } });
	await expect(
		db
			.update(sites)
			.set({ publishedReleaseId: first.id })
			.where(eq(sites.id, otherSite.id))
			.execute(),
	).rejects.toMatchObject({ cause: { code: "23503" } });
	expect(
		(await db.select().from(sites).where(eq(sites.id, otherSite.id)))[0].publishedReleaseId,
	).toBeNull();
	const invalidAssetId = crypto.randomUUID();
	await expect(
		db
			.insert(assets)
			.values({
				id: invalidAssetId,
				siteId: site.id,
				uploaderId: other.id,
				key: `integration/${invalidAssetId}`,
				stagingKey: `integration-staging/${invalidAssetId}`,
				mime: "image/png",
				size: 1,
				expiresAt: new Date(Date.now() + 60000),
			})
			.execute(),
	).rejects.toMatchObject({ cause: { code: "23503" } });
	expect(await db.select().from(assets).where(eq(assets.id, invalidAssetId))).toHaveLength(0);
	const publicPath = `/api/public/sites/${slug}`;
	const publicData = await result<PublicSite>(await request(publicPath));
	expect(publicData.draft.articles?.map((value) => value.slug)).toEqual([article.slug]);
	expect(JSON.stringify(publicData)).not.toContain(owner.email);
	expect(Object.keys(publicData).sort()).toEqual(["draft", "publishedAt", "releaseId", "slug"]);
	const publicArticle = await result<{ article: Article }>(
		await request(`${publicPath}/articles/${article.slug}`),
	);
	expect(publicArticle.article.readTimeMinutes).toBe(3);
	await error(await request(`${publicPath}/articles/${privateArticle.slug}`), 404);
	const project = site.draft.projects[0];
	const publicProject = await result<{ project: { id: string } }>(
		await request(`${publicPath}/projects/${project.id}`),
	);
	expect(publicProject.project.id).toBe(project.id);
	const collisionLookup = await result<{ project: { id: string; title: string } }>(
		await request(`${publicPath}/projects/${collisionId}`),
	);
	expect(collisionLookup.project.id).toBe(collisionId);
	expect(collisionLookup.project.title).toBe("Exact ID wins");
	const history = await result<{ items: { id: string }[]; hasMore: boolean }>(
		await request(`${base}/releases?limit=1&offset=0`, "GET", undefined, owner.cookie),
	);
	expect(history.items.map((value) => value.id)).toEqual([first.id]);
	expect(history.hasMore).toBe(false);
	for (const query of ["limit=0", "limit=101", "offset=-1", "offset=nope"])
		await error(await request(`${base}/releases?${query}`, "GET", undefined, owner.cookie), 400);
	await error(await request(`${base}/releases`, "GET", undefined, other.cookie), 404);
	await error(await request(`${base}/releases/${first.id}`, "GET", undefined, other.cookie), 404);
	await error(
		await request(
			`${base}/releases/${first.id}/activate`,
			"POST",
			{ expectedReleaseId: first.id },
			other.cookie,
		),
		404,
	);
	const detail = await result<{ snapshot: PublicSite["draft"] }>(
		await request(`${base}/releases/${first.id}`, "GET", undefined, owner.cookie),
	);
	expect(detail.snapshot.articles?.map((value) => value.slug)).toEqual([article.slug]);
	site = await result<Site>(
		await request(
			`${base}/profile`,
			"PATCH",
			{ revision: site.revision, profile: { bio: "A second published revision" } },
			owner.cookie,
		),
	);
	const second = await result<{ id: string }>(
		await request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
	);
	expect(second.id).not.toBe(first.id);
	const pageOne = await result<{ items: { id: string }[]; hasMore: boolean }>(
		await request(`${base}/releases?limit=1&offset=0`, "GET", undefined, owner.cookie),
	);
	const pageTwo = await result<{ items: { id: string }[]; hasMore: boolean }>(
		await request(`${base}/releases?limit=1&offset=1`, "GET", undefined, owner.cookie),
	);
	expect(pageOne.items[0].id).toBe(second.id);
	expect(pageOne.hasMore).toBe(true);
	expect(pageTwo.items[0].id).toBe(first.id);
	expect(pageTwo.hasMore).toBe(false);
	await error(
		await request(
			`${base}/releases/${first.id}/activate`,
			"POST",
			{ expectedReleaseId: first.id },
			owner.cookie,
		),
		409,
		"PUBLICATION_CONFLICT",
	);
	await result<Site>(
		await request(
			`${base}/releases/${first.id}/activate`,
			"POST",
			{ expectedReleaseId: second.id },
			owner.cookie,
		),
	);
	expect((await result<PublicSite>(await request(publicPath))).releaseId).toBe(first.id);
	expect(
		(await result<Site>(await request(`${base}/preview`, "GET", undefined, owner.cookie))).draft
			.profile.bio,
	).toBe("A second published revision");

	for (const ip of ["unknown", "127.0.0.1", "untrusted"])
		bucketKeys.push(new Bun.CryptoHasher("sha256").update(`inquiry:${slug}:${ip}`).digest("hex"));
	bucketKeys.push(new Bun.CryptoHasher("sha256").update(`inquiry:site:${slug}`).digest("hex"));
	const inquiry = {
		name: "Visitor",
		email: "visitor@example.com",
		message: "A real inquiry message",
		website: "",
	};
	await error(
		await request(`${publicPath}/inquiries`, "POST", {
			...inquiry,
			website: "https://spam.example",
		}),
		400,
	);
	const sent = await result<{ id: string }>(
		await request(`${publicPath}/inquiries`, "POST", inquiry),
		201,
	);
	await error(await request(`${base}/inquiries`, "GET", undefined, other.cookie), 404);
	await error(
		await request(`${base}/inquiries/${sent.id}`, "PATCH", { status: "read" }, other.cookie),
		404,
	);
	const inbox = await result<{ items: { id: string; status: string }[] }>(
		await request(`${base}/inquiries?limit=1&offset=0`, "GET", undefined, owner.cookie),
	);
	expect(inbox.items[0].id).toBe(sent.id);
	expect(inbox.items[0].status).toBe("new");
	await result<unknown>(
		await request(`${base}/inquiries/${sent.id}`, "PATCH", { status: "read" }, owner.cookie),
	);
	await result<unknown>(
		await request(`${base}/inquiries/${sent.id}`, "PATCH", { status: "archived" }, owner.cookie),
	);
	const archived = await result<{ items: { status: string }[] }>(
		await request(`${base}/inquiries?status=archived`, "GET", undefined, owner.cookie),
	);
	expect(archived.items[0].status).toBe("archived");
	await error(await request(`${base}/inquiries?limit=0`, "GET", undefined, owner.cookie), 400);
	for (let i = 0; i < 4; i++)
		await result<unknown>(await request(`${publicPath}/inquiries`, "POST", inquiry), 201);
	const blocked = await request(`${publicPath}/inquiries`, "POST", inquiry);
	await error(blocked, 429, "RATE_LIMITED");
	expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);

	expect(
		await result<unknown[]>(await request(`${base}/assets`, "GET", undefined, owner.cookie)),
	).toEqual([]);
	for (const [suffix, body] of [
		["upload-intent", { mime: "image/png", size: 100 }],
		["cleanup", {}],
	] as const) {
		await error(await request(`${base}/assets/${suffix}`, "POST", body, other.cookie), 404);
		await error(
			await request(`${base}/assets/${suffix}`, "POST", body, owner.cookie),
			503,
			"STORAGE_UNAVAILABLE",
		);
	}
	await error(
		await request(`${base}/assets/${crypto.randomUUID()}/complete`, "POST", {}, owner.cookie),
		404,
	);
	await error(
		await request("/api/auth/request-password-reset", "POST", {
			email: owner.email,
			redirectTo: env.WEB_URL,
		}),
		503,
		"MAIL_UNAVAILABLE",
	);
	await error(
		await request(
			"/api/auth/send-verification-email",
			"POST",
			{ email: owner.email, callbackURL: env.WEB_URL },
			owner.cookie,
		),
		503,
		"MAIL_UNAVAILABLE",
	);
}, 120_000);
