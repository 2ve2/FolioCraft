import { collectAssetIds, type Draft, publishedDraft } from "@ichnara/contracts";
import { and, asc, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "../db";
import { assets } from "../db/schema/asset";
import { user } from "../db/schema/auth";
import { releases, sites } from "../db/schema/site";
import { ApiError } from "../lib/response-helpers";
import { storage, UPLOAD_EXPIRY_SECONDS } from "../lib/storage";
import { publicAccessPredicate } from "./sites/public-access";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Asset = typeof assets.$inferSelect;

/** Builds the site ownership predicate for asset operations. */
const ownedSite = (siteId: string, userId: string) =>
	and(eq(sites.id, siteId), eq(sites.ownerId, userId));

/** Scopes an asset to its site and original uploader. */
const ownedAsset = (siteId: string, userId: string, assetId: string) =>
	and(eq(assets.id, assetId), eq(assets.siteId, siteId), eq(assets.uploaderId, userId));

/** Returns asset metadata without private storage object keys. */
const dto = (a: Asset) => ({
	id: a.id,
	siteId: a.siteId,
	mime: a.mime,
	size: a.size,
	width: a.width,
	height: a.height,
	status: a.status,
	expiresAt: a.expiresAt.toISOString(),
	createdAt: a.createdAt.toISOString(),
});

/** Locks an owned site before its asset lifecycle changes. */
async function lockSite(tx: Tx, siteId: string, userId: string) {
	const [site] = await tx.select().from(sites).where(ownedSite(siteId, userId)).for("update");
	if (!site) throw new ApiError(404, "NOT_FOUND");
	return site;
}

/** Caller must lock the owned site first. Locks referenced assets in sorted order until commit. */
export async function validateAssets(tx: Tx, siteId: string, userId: string, draft: Draft) {
	const ids = [...new Set(collectAssetIds(draft))].sort();
	if (!ids.length) return;
	const rows = await tx
		.select()
		.from(assets)
		.where(and(inArray(assets.id, ids), eq(assets.siteId, siteId), eq(assets.uploaderId, userId)))
		.orderBy(asc(assets.id))
		.for("update");
	if (
		rows.length !== ids.length ||
		rows.some((a) => a.siteId !== siteId || a.uploaderId !== userId || a.status !== "ready")
	)
		throw new ApiError(422, "ASSET_NOT_READY_OR_OWNED");
}

export const assetService = {
	/** Lists bounded asset metadata after checking site ownership. */
	async list(userId: string, siteId: string) {
		const [site] = await db.select({ id: sites.id }).from(sites).where(ownedSite(siteId, userId));
		if (!site) throw new ApiError(404, "NOT_FOUND");
		const rows = await db
			.select()
			.from(assets)
			.where(
				and(eq(assets.siteId, siteId), eq(assets.uploaderId, userId), ne(assets.status, "deleted")),
			)
			.orderBy(desc(assets.createdAt))
			.limit(100);
		return rows.map(dto);
	},

	/** Issues a bounded staging upload and records its owned pending asset. */
	async intent(userId: string, siteId: string, mime: string, size: number) {
		return db.transaction(async (tx) => {
			await lockSite(tx, siteId, userId);
			storage.assertConfigured();
			const active = await tx
				.select({ id: assets.id })
				.from(assets)
				.where(and(eq(assets.siteId, siteId), ne(assets.status, "deleted")))
				.limit(100);
			if (active.length >= 100) throw new ApiError(429, "ASSET_LIMIT_REACHED");
			const id = crypto.randomUUID();
			const stagingKey = `staging/${siteId}/${id}`;
			const key = `verified/${siteId}/${id}`;
			const uploadUrl = await storage.uploadUrl(stagingKey, mime, size);
			const [asset] = await tx
				.insert(assets)
				.values({
					id,
					siteId,
					uploaderId: userId,
					key,
					stagingKey,
					mime,
					size,
					expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000),
				})
				.returning();
			return {
				...dto(asset),
				uploadUrl,
				uploadHeaders: { "Content-Type": mime },
				uploadExpiresIn: UPLOAD_EXPIRY_SECONDS,
			};
		});
	},

	/** Verifies and copies immutable bytes before marking an owned asset ready. */
	async complete(userId: string, siteId: string, id: string) {
		return db.transaction(async (tx) => {
			await lockSite(tx, siteId, userId);
			const [asset] = await tx
				.select()
				.from(assets)
				.where(ownedAsset(siteId, userId, id))
				.for("update");
			if (!asset) throw new ApiError(404, "NOT_FOUND");
			if (asset.status === "ready") return dto(asset);
			if (asset.status !== "pending") throw new ApiError(409, "ASSET_STATE_CONFLICT");
			if (asset.expiresAt.getTime() < Date.now()) throw new ApiError(409, "UPLOAD_EXPIRED");
			storage.assertConfigured();
			const dimensions = await storage.verifyAndCopy(
				asset.stagingKey,
				asset.key,
				asset.mime,
				asset.size,
			);
			const [saved] = await tx
				.update(assets)
				.set({ status: "ready", ...dimensions, updatedAt: new Date() })
				.where(eq(assets.id, id))
				.returning();
			return dto(saved);
		});
	},

	/** Issues a short-lived private download for an owned ready asset. */
	async download(userId: string, siteId: string, id: string) {
		const [asset] = await db
			.select({ asset: assets })
			.from(assets)
			.innerJoin(sites, eq(sites.id, assets.siteId))
			.where(
				and(ownedSite(siteId, userId), ownedAsset(siteId, userId, id), eq(assets.status, "ready")),
			);
		if (!asset) throw new ApiError(404, "NOT_FOUND");
		return { url: await storage.downloadUrl(asset.asset.key), expiresIn: 60 };
	},

	/** Issues a download only for a ready asset referenced by an accessible public release. */
	async publicUrl(slug: string, id: string) {
		const [row] = await db
			.select({ snapshot: releases.snapshot, key: assets.key })
			.from(sites)
			.innerJoin(
				releases,
				and(eq(sites.publishedReleaseId, releases.id), eq(sites.id, releases.siteId)),
			)
			.innerJoin(
				assets,
				and(eq(assets.siteId, sites.id), eq(assets.id, id), eq(assets.status, "ready")),
			)
			.innerJoin(user, eq(user.id, sites.ownerId))
			.where(and(eq(sites.slug, slug), publicAccessPredicate()));
		if (!row || !collectAssetIds(publishedDraft(row.snapshot)).includes(id))
			throw new ApiError(404, "NOT_FOUND");
		return storage.downloadUrl(row.key);
	},

	/** Records durable deletion intent while protecting draft and historical references. */
	async delete(userId: string, siteId: string, id: string) {
		// Durable intent is committed before provider IO. Provider failure keeps deleting for an explicit retry.
		const asset = await db.transaction(async (tx) => {
			const site = await lockSite(tx, siteId, userId);
			const [asset] = await tx
				.select()
				.from(assets)
				.where(ownedAsset(siteId, userId, id))
				.for("update");
			if (!asset) throw new ApiError(404, "NOT_FOUND");
			if (asset.status === "deleted") return asset;
			storage.assertConfigured();
			const historical = await tx
				.select({ snapshot: releases.snapshot })
				.from(releases)
				.where(eq(releases.siteId, siteId));
			if (
				collectAssetIds(site.draft).includes(id) ||
				historical.some((r) => collectAssetIds(r.snapshot).includes(id))
			)
				throw new ApiError(409, "ASSET_REFERENCED");
			const [deleting] = await tx
				.update(assets)
				.set({ status: "deleting", updatedAt: new Date() })
				.where(eq(assets.id, id))
				.returning();
			return deleting;
		});
		if (asset.status === "deleted") return { id, status: "deleted" as const };
		await storage.delete(asset.key);
		await storage.delete(asset.stagingKey);
		// A still-valid presigned PUT can recreate staging bytes: keep a cleanup tombstone until it expires.
		const expired = asset.expiresAt.getTime() + 60000 <= Date.now();
		if (expired)
			await db
				.update(assets)
				.set({ status: "deleted", updatedAt: new Date() })
				.where(and(eq(assets.id, id), eq(assets.status, "deleting")));
		return {
			id,
			status: expired ? ("deleted" as const) : ("deleting" as const),
			retryAfter: expired ? null : new Date(asset.expiresAt.getTime() + 60000).toISOString(),
		};
	},

	/** Retries bounded expired uploads and removes verified assets staging copies. */
	async cleanup(userId: string, siteId: string) {
		const [site] = await db.select({ id: sites.id }).from(sites).where(ownedSite(siteId, userId));
		if (!site) throw new ApiError(404, "NOT_FOUND");
		storage.assertConfigured();
		const expired = await db
			.select()
			.from(assets)
			.where(
				and(
					eq(assets.siteId, siteId),
					eq(assets.uploaderId, userId),
					lt(assets.expiresAt, new Date(Date.now() - 60000)),
					or(
						eq(assets.status, "pending"),
						eq(assets.status, "deleting"),
						eq(assets.status, "ready"),
					),
				),
			)
			.orderBy(asc(assets.id))
			.limit(100);
		const results = [];
		for (const asset of expired) {
			if (asset.status === "ready") {
				await storage.delete(asset.stagingKey);
				results.push({ id: asset.id, status: "staging_cleaned" });
			} else results.push(await this.delete(userId, siteId, asset.id));
		}
		return { results };
	},
};
