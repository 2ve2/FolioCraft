import { draftSchema, publishedDraft } from "@ichnara/contracts";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { releases, sites } from "../../db/schema/site";
import { ApiError } from "../../lib/response-helpers";
import { validateAssets } from "../assets";
import { lockOwnedSite, ownedSite, siteDraftService, siteDto } from "./draft-service";

export const releaseService = {
	/** Creates or reuses an immutable release while preventing suspended publication. */
	async publish(userId: string, id: string, revision: number) {
		return db.transaction(async (tx) => {
			const site = await lockOwnedSite(tx, userId, id);
			if (site.suspended) throw new ApiError(403, "SITE_SUSPENDED");
			if (site.revision !== revision) throw new ApiError(409, "REVISION_CONFLICT");
			const snapshot = publishedDraft(draftSchema.parse(site.draft));
			if (!snapshot.profile.name.trim() || !snapshot.profile.role.trim())
				throw new ApiError(400, "PROFILE_REQUIRED");
			await validateAssets(tx, id, userId, snapshot);
			const [existing] = await tx
				.select()
				.from(releases)
				.where(and(eq(releases.siteId, id), eq(releases.revision, revision)));
			const release =
				existing ??
				(await tx.insert(releases).values({ siteId: id, revision, snapshot }).returning())[0];
			await tx
				.update(sites)
				.set({ publishedReleaseId: release.id, updatedAt: new Date() })
				.where(ownedSite(id, userId));
			return { id: release.id, revision: release.revision };
		});
	},

	/** Removes the public pointer while retaining draft and historical releases. */
	async unpublish(userId: string, id: string) {
		return db.transaction(async (tx) => {
			await lockOwnedSite(tx, userId, id);
			const [site] = await tx
				.update(sites)
				.set({ publishedReleaseId: null, updatedAt: new Date() })
				.where(ownedSite(id, userId))
				.returning();
			return siteDto(site);
		});
	},

	/** Lists bounded owned release history with the active pointer. */
	async history(userId: string, id: string, limit: number, offset: number) {
		const site = await siteDraftService.preview(userId, id);
		const rows = await db
			.select({ id: releases.id, revision: releases.revision, createdAt: releases.createdAt })
			.from(releases)
			.where(eq(releases.siteId, id))
			.orderBy(sql`${releases.createdAt} desc`, sql`${releases.id} desc`)
			.limit(limit + 1)
			.offset(offset);
		return {
			items: rows.slice(0, limit).map((row) => ({
				...row,
				active: row.id === site.publishedReleaseId,
				createdAt: row.createdAt.toISOString(),
			})),
			hasMore: rows.length > limit,
			limit,
			offset,
		};
	},

	/** Reads an immutable release belonging to the owned site. */
	async release(userId: string, id: string, releaseId: string) {
		await siteDraftService.preview(userId, id);
		const [release] = await db
			.select()
			.from(releases)
			.where(and(eq(releases.id, releaseId), eq(releases.siteId, id)))
			.limit(1);
		if (!release) throw new ApiError(404, "NOT_FOUND");
		return {
			id: release.id,
			revision: release.revision,
			createdAt: release.createdAt.toISOString(),
			snapshot: release.snapshot,
		};
	},

	/** Activates an owned historical release using a publication compare-and-swap guard. */
	async activate(userId: string, id: string, releaseId: string, expected: string | null) {
		return db.transaction(async (tx) => {
			const site = await lockOwnedSite(tx, userId, id);
			if (site.suspended) throw new ApiError(403, "SITE_SUSPENDED");
			if (site.publishedReleaseId !== expected) throw new ApiError(409, "PUBLICATION_CONFLICT");
			const [release] = await tx
				.select()
				.from(releases)
				.where(and(eq(releases.id, releaseId), eq(releases.siteId, id)))
				.limit(1);
			if (!release) throw new ApiError(404, "NOT_FOUND");
			await validateAssets(tx, id, userId, release.snapshot);
			const [updated] = await tx
				.update(sites)
				.set({ publishedReleaseId: release.id, updatedAt: new Date() })
				.where(ownedSite(id, userId))
				.returning();
			return siteDto(updated);
		});
	},
};
