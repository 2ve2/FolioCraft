import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { storageConfigured } from "../config/env";
import { db } from "../db";
import { assets } from "../db/schema/asset";
import { rateLimit, session, verification } from "../db/schema/auth";
import { storageDeletions } from "../db/schema/storage";
import { storage } from "../lib/storage";
import { rateLimitService } from "./rate-limit";

type Executor = Pick<typeof db, "insert">;
type StorageDeletionReason = (typeof storageDeletions.$inferInsert)["reason"];

/** Storage operations used by maintenance; tests pass an in-memory implementation. */
export type MaintenanceStorage = {
	configured: boolean;
	listKeys(prefix: string, limit: number): Promise<string[]>;
	delete(key: string): Promise<void>;
};

export type MaintenanceReport = {
	rateBuckets: number;
	authRateLimits: number;
	sessions: number;
	verifications: number;
	abandonedUploads: number;
	storage: { prefixesCompleted: number; objectsDeleted: number; failures: number } | "disabled";
};

const DAY_MS = 86_400_000;
/** Bounds each run so a single invocation stays well inside Worker CPU and subrequest limits. */
const UPLOAD_BATCH = 200;
const PREFIX_BATCH = 20;
const KEYS_PER_PREFIX = 100;
const MAX_DELETIONS = 500;

const liveStorage: MaintenanceStorage = {
	configured: storageConfigured,
	listKeys: (prefix, limit) => storage.listKeys(prefix, limit),
	delete: (key) => storage.delete(key),
};

/** Queues private object prefixes for deletion; duplicates are ignored. */
export async function enqueueStorageDeletion(
	executor: Executor,
	prefixes: string[],
	reason: StorageDeletionReason,
) {
	if (!prefixes.length) return;
	await executor
		.insert(storageDeletions)
		.values(prefixes.map((prefix) => ({ prefix, reason })))
		.onConflictDoNothing();
}

/** Returns the R2 prefixes holding every staged and verified object of the given sites. */
export const sitePrefixes = (siteIds: string[]) =>
	siteIds.flatMap((siteId) => [`staging/${siteId}/`, `verified/${siteId}/`]);

/** Retires uploads that were never completed (or whose deletion stalled) once their signed URL expired. */
async function retireAbandonedUploads(now: Date): Promise<number> {
	return db.transaction(async (tx) => {
		const stale = await tx
			.select({ id: assets.id, key: assets.key, stagingKey: assets.stagingKey })
			.from(assets)
			.where(
				and(
					inArray(assets.status, ["pending", "deleting"]),
					lt(assets.expiresAt, new Date(now.getTime() - 3_600_000)),
				),
			)
			.orderBy(asc(assets.expiresAt))
			.limit(UPLOAD_BATCH)
			.for("update", { skipLocked: true });
		if (!stale.length) return 0;
		// Pending/deleting assets can never be referenced by drafts or releases (only ready ones can).
		await enqueueStorageDeletion(
			tx,
			stale.flatMap((asset) => [asset.stagingKey, asset.key]),
			"abandoned_upload",
		);
		await tx
			.update(assets)
			.set({ status: "deleted", updatedAt: now })
			.where(
				inArray(
					assets.id,
					stale.map((asset) => asset.id),
				),
			);
		return stale.length;
	});
}

/** Deletes queued objects in bounded batches; a prefix leaves the queue once it lists empty. */
async function drainStorageQueue(store: MaintenanceStorage, now: Date) {
	const report = { prefixesCompleted: 0, objectsDeleted: 0, failures: 0 };
	const queue = await db
		.select()
		.from(storageDeletions)
		.orderBy(asc(storageDeletions.createdAt))
		.limit(PREFIX_BATCH);
	for (const entry of queue) {
		if (report.objectsDeleted >= MAX_DELETIONS) break;
		try {
			const keys = await store.listKeys(entry.prefix, KEYS_PER_PREFIX);
			for (const key of keys) {
				await store.delete(key);
				report.objectsDeleted++;
			}
			if (keys.length < KEYS_PER_PREFIX) {
				await db.delete(storageDeletions).where(eq(storageDeletions.prefix, entry.prefix));
				report.prefixesCompleted++;
			} else
				await db
					.update(storageDeletions)
					.set({ updatedAt: now })
					.where(eq(storageDeletions.prefix, entry.prefix));
		} catch {
			report.failures++;
			await db
				.update(storageDeletions)
				.set({ attempts: sql`${storageDeletions.attempts} + 1`, updatedAt: now })
				.where(eq(storageDeletions.prefix, entry.prefix));
		}
	}
	return report;
}

export const maintenanceService = {
	/** Runs every bounded, idempotent housekeeping job and reports what changed. */
	async run({
		store = liveStorage,
		now = new Date(),
	}: {
		store?: MaintenanceStorage;
		now?: Date;
	} = {}): Promise<MaintenanceReport> {
		const dayAgo = new Date(now.getTime() - DAY_MS);
		const rateBuckets = await rateLimitService.cleanup();
		const authRateLimits =
			(await db.delete(rateLimit).where(lt(rateLimit.lastRequest, dayAgo.getTime()))).rowCount ?? 0;
		const sessions = (await db.delete(session).where(lt(session.expiresAt, dayAgo))).rowCount ?? 0;
		const verifications =
			(await db.delete(verification).where(lt(verification.expiresAt, dayAgo))).rowCount ?? 0;
		const abandonedUploads = await retireAbandonedUploads(now);
		return {
			rateBuckets,
			authRateLimits,
			sessions,
			verifications,
			abandonedUploads,
			storage: store.configured ? await drainStorageQueue(store, now) : "disabled",
		};
	},
};
