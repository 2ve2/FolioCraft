import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { newId, type Site } from "@ichnara/contracts";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { releases, sites } from "../src/db/schema/site";
import { RELEASE_RETENTION } from "../src/services/sites/release-service";
import { account, request, result } from "./helpers";

const ids: string[] = [];

afterAll(async () => {
	if (ids.length) await db.delete(user).where(inArray(user.id, ids));
});

test("publishing keeps the newest releases, always including the active one", async () => {
	const owner = await account("retention", ids);
	let site = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `retention-${newId().slice(0, 12)}`, locale: "en" },
			owner.cookie,
		),
	);
	const draft = {
		...site.draft,
		profile: { ...site.draft.profile, name: "Retention", role: "QA" },
	};
	site = await result<Site>(
		await request(
			`/api/sites/${site.id}/draft`,
			"PUT",
			{ revision: site.revision, draft },
			owner.cookie,
		),
	);
	// Seed older releases directly; their revisions cannot collide with the live revision.
	const seeded = Array.from({ length: RELEASE_RETENTION + 5 }, (_, index) => ({
		id: newId(),
		siteId: site.id,
		revision: 10_000 + index,
		snapshot: site.draft,
		createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
	}));
	await db.insert(releases).values(seeded);

	const published = await result<{ id: string }>(
		await request(
			`/api/sites/${site.id}/releases`,
			"POST",
			{ revision: site.revision },
			owner.cookie,
		),
	);
	const kept = await db
		.select({ id: releases.id })
		.from(releases)
		.where(eq(releases.siteId, site.id));
	expect(kept.length).toBe(RELEASE_RETENTION);
	const keptIds = new Set(kept.map((row) => row.id));
	expect(keptIds.has(published.id)).toBe(true);
	// The six oldest seeded releases fall outside the window; the newest seeded ones remain.
	for (const old of seeded.slice(0, 6)) expect(keptIds.has(old.id)).toBe(false);
	for (const recent of seeded.slice(6)) expect(keptIds.has(recent.id)).toBe(true);
	const [pointer] = await db
		.select({ active: sites.publishedReleaseId })
		.from(sites)
		.where(eq(sites.id, site.id));
	expect(pointer.active).toBe(published.id);

	// Re-publishing the same revision reuses its release and deletes nothing more.
	await result(
		await request(
			`/api/sites/${site.id}/releases`,
			"POST",
			{ revision: site.revision },
			owner.cookie,
		),
	);
	const [count] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(releases)
		.where(eq(releases.siteId, site.id));
	expect(count.total).toBe(RELEASE_RETENTION);
});
