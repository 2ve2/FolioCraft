import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import type { Site } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { inquiries } from "../src/db/schema/operations";
import { sites } from "../src/db/schema/site";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];
afterAll(async () => {
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(user).where(inArray(user.id, ids));
	}
});

test("admin moderation is owned, audited, reversible and closes every public surface", async () => {
	const admin = await account("moderation-admin", ids);
	const owner = await account("moderation-owner", ids);
	await error(await request("/api/admin/sites"), 401);
	await error(
		await request("/api/admin/sites", "GET", undefined, owner.cookie),
		403,
		"ADMIN_REQUIRED",
	);
	// Only isolated disposable fixtures receive admin privileges.
	await db.update(user).set({ role: "owner" }).where(eq(user.id, admin.id));
	const slug = `moderation-${crypto.randomUUID()}`;
	let site = await result<Site>(
		await request("/api/sites", "POST", { slug, locale: "ar" }, owner.cookie),
	);
	const discover = async () =>
		(
			await result<{ sites: { slug: string; publishedAt: string }[] }>(
				await request("/api/public/sitemap"),
			)
		).sites;
	expect((await discover()).some((entry) => entry.slug === slug)).toBe(false);
	await error(await request("/api/public/sitemap?after=invalid!"), 400);
	await error(await request("/api/public/sitemap?extra=value"), 400);
	const assetId = crypto.randomUUID();
	await db.insert(assets).values({
		id: assetId,
		siteId: site.id,
		uploaderId: owner.id,
		key: `verified/${site.id}/${assetId}`,
		stagingKey: `staging/${site.id}/${assetId}`,
		mime: "image/png",
		size: 100,
		status: "ready",
		width: 1,
		height: 1,
		expiresAt: new Date(Date.now() + 60000),
	});
	const projectId = crypto.randomUUID();
	site = await result<Site>(
		await request(
			`/api/sites/${site.id}/draft`,
			"PUT",
			{
				revision: site.revision,
				draft: {
					...site.draft,
					profile: { ...site.draft.profile, name: "مالك", role: "Designer", imageAssetId: assetId },
					projects: [
						{
							id: projectId,
							title: "Project",
							summary: "Summary",
							body: "Body",
							role: "Designer",
							year: "2026",
							tools: "Bun",
							url: "",
						},
					],
				},
			},
			owner.cookie,
		),
	);
	const release = await result<{ id: string }>(
		await request(
			`/api/sites/${site.id}/releases`,
			"POST",
			{ revision: site.revision },
			owner.cookie,
		),
	);
	const publicBase = `/api/public/sites/${slug}`;
	await result(await request(publicBase));
	const visible = (await discover()).find((entry) => entry.slug === slug);
	expect(visible).toBeDefined();
	expect(Object.keys(visible ?? {}).sort()).toEqual(["publishedAt", "slug"]);
	expect(
		(
			await result<{ sites: { slug: string }[] }>(
				await request(`/api/public/sitemap?after=${slug}`),
			)
		).sites.some((entry) => entry.slug === slug),
	).toBe(false);
	await error(await request(`${publicBase}/assets/${assetId}`), 503, "STORAGE_UNAVAILABLE");
	await error(
		await request(
			`/api/admin/sites/${site.id}/suspend`,
			"POST",
			{ reason: "Review required" },
			owner.cookie,
		),
		403,
	);
	await error(
		await request(`/api/admin/sites/${site.id}/suspend`, "POST", { reason: "" }, admin.cookie),
		400,
	);
	await result(
		await request(
			`/api/admin/sites/${site.id}/suspend`,
			"POST",
			{ reason: "Review required", password: admin.password },
			admin.cookie,
		),
	);
	await error(
		await request(
			`/api/admin/sites/${site.id}/suspend`,
			"POST",
			{ reason: "Duplicate review", password: admin.password },
			admin.cookie,
		),
		409,
	);
	for (const path of [
		publicBase,
		`${publicBase}/projects/${projectId}`,
		`${publicBase}/assets/${assetId}`,
	])
		await error(await request(path), 404, "NOT_FOUND");
	expect((await discover()).some((entry) => entry.slug === slug)).toBe(false);
	const inquiry = {
		name: "Visitor",
		email: "visitor@example.com",
		message: "A valid inquiry message",
	};
	await error(await request(`${publicBase}/inquiries`, "POST", inquiry), 404, "NOT_FOUND");
	await error(
		await request(
			`/api/sites/${site.id}/releases`,
			"POST",
			{ revision: site.revision },
			owner.cookie,
		),
		403,
		"SITE_SUSPENDED",
	);
	await error(
		await request(
			`/api/sites/${site.id}/releases/${release.id}/activate`,
			"POST",
			{ expectedReleaseId: release.id },
			owner.cookie,
		),
		403,
		"SITE_SUSPENDED",
	);
	// Moderation preserves the release pointer and lets the owner inspect the draft.
	expect(
		(
			await result<Site>(
				await request(`/api/sites/${site.id}/preview`, "GET", undefined, owner.cookie),
			)
		).publishedReleaseId,
	).toBe(release.id);
	const detail = await result<Record<string, unknown>>(
		await request(`/api/admin/sites/${site.id}`, "GET", undefined, admin.cookie),
	);
	expect(JSON.stringify(detail)).not.toContain("visitor@example.com");
	expect(detail).not.toHaveProperty("draft");
	expect(detail.releaseCount).toBe(1);
	expect(detail.assetCount).toBe(1);
	expect(detail.inquiryCount).toBe(0);
	await result(
		await request(
			`/api/admin/sites/${site.id}/resume`,
			"POST",
			{ reason: "Review completed", password: admin.password },
			admin.cookie,
		),
	);
	await result(await request(publicBase));
	const audit = await db.select().from(adminAudit).where(eq(adminAudit.actorId, admin.id));
	const successes = audit.filter((row) => row.targetId === site.id && row.status === "succeeded");
	expect(successes).toHaveLength(2);
	const completed = audit.filter((row) =>
		successes.some((outcome) => outcome.requestId === row.requestId),
	);
	expect(completed).toHaveLength(4);
	for (const outcome of successes) {
		const pair = completed.filter((row) => row.requestId === outcome.requestId);
		expect(pair.map((row) => row.status).sort()).toEqual(["attempted", "succeeded"]);
		expect(
			pair.every(
				(row) =>
					row.reason === outcome.reason &&
					row.action === outcome.action &&
					row.actorId === outcome.actorId &&
					row.targetId === site.id,
			),
		).toBe(true);
	}
	await result(await request("/api/admin/audit?limit=1", "GET", undefined, admin.cookie));
	await error(await request("/api/admin/sites?limit=101", "GET", undefined, admin.cookie), 400);
	await result(await request("/api/admin/resources", "GET", undefined, admin.cookie));
	// An active account ban closes public reads even with a preserved release.
	await db.update(user).set({ banned: true, banExpires: null }).where(eq(user.id, owner.id));
	expect((await discover()).some((entry) => entry.slug === slug)).toBe(false);
	await error(await request(publicBase), 404, "NOT_FOUND");
	await error(await request(`${publicBase}/assets/${assetId}`), 404, "NOT_FOUND");
	await error(await request(`${publicBase}/inquiries`, "POST", inquiry), 404, "NOT_FOUND");
	await db
		.update(user)
		.set({ banExpires: new Date(Date.now() + 60000) })
		.where(eq(user.id, owner.id));
	await error(await request(publicBase), 404, "NOT_FOUND");
	await error(await request(`${publicBase}/assets/${assetId}`), 404, "NOT_FOUND");
	await db
		.update(user)
		.set({ banExpires: new Date(Date.now() - 60000) })
		.where(eq(user.id, owner.id));
	await result(await request(publicBase));
	await error(await request(`${publicBase}/assets/${assetId}`), 503, "STORAGE_UNAVAILABLE");
	await result(await request(`${publicBase}/inquiries`, "POST", inquiry), 201);
	expect((await discover()).some((entry) => entry.slug === slug)).toBe(true);
	expect(await db.select().from(inquiries).where(eq(inquiries.siteId, site.id))).toHaveLength(1);
	expect((await db.select().from(sites).where(eq(sites.id, site.id)))[0].publishedReleaseId).toBe(
		release.id,
	);
	// Counts must stay scoped to the selected site, including the zero-resource case.
	const otherSite = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `counts-${crypto.randomUUID()}`, locale: "ar" },
			admin.cookie,
		),
	);
	const ownedCounts = await result<Record<string, unknown>>(
		await request(`/api/admin/sites/${site.id}`, "GET", undefined, admin.cookie),
	);
	const emptyCounts = await result<Record<string, unknown>>(
		await request(`/api/admin/sites/${otherSite.id}`, "GET", undefined, admin.cookie),
	);
	expect([ownedCounts.releaseCount, ownedCounts.assetCount, ownedCounts.inquiryCount]).toEqual([
		1, 1, 1,
	]);
	expect([emptyCounts.releaseCount, emptyCounts.assetCount, emptyCounts.inquiryCount]).toEqual([
		0, 0, 0,
	]);
});
