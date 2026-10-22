import { AsyncLocalStorage } from "node:async_hooks";
import { newId } from "@ichnara/contracts";
import { REVALIDATION_PATH } from "@ichnara/contracts/public-cache";
import { captureMessage } from "@sentry/cloudflare";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { cacheInvalidations } from "../db/schema/cache";

/** The R2 calls used for the pending-retry signal (a subset of the Workers R2Bucket binding). */
type SignalBucket = {
	head(key: string): Promise<{ etag: string; customMetadata?: Record<string, string> } | null>;
	put(
		key: string,
		value: string,
		options?: {
			customMetadata?: Record<string, string>;
			onlyIf?: { etagMatches: string };
		},
	): Promise<unknown>;
};
export type RevalidationBindings = {
	PORTFOLIO_REVALIDATION?: { fetch(request: Request): Promise<Response> };
	PORTFOLIO_REVALIDATION_SECRET?: string;
	PUBLIC_CACHE_SIGNAL?: SignalBucket;
};

/** Lives beside, never inside, the web Worker's incremental-cache keys in the same bucket. */
export const PENDING_SIGNAL_KEY = "ichnara-signals/cache-invalidation-pending";

/** Records that a delivery failed, so the minute retry knows the database has work for it. */
async function markPending(signal: SignalBucket | undefined) {
	if (!signal) return;
	try {
		// R2 etags hash the content, so each mark needs unique content for the conditional clear.
		await signal.put(PENDING_SIGNAL_KEY, newId(), { customMetadata: { state: "pending" } });
	} catch {
		// The daily maintenance flush still drains the backlog without this signal.
		console.error(JSON.stringify({ event: "cache_signal_failed" }));
	}
}
type Delivery = (intent: { siteId: string; slug: string }) => Promise<void>;
const deliveryContext = new AsyncLocalStorage<Delivery | undefined>();
const affectedSites = new AsyncLocalStorage<Set<string>>();

/** Records the already-authorized mutation target for immediate delivery ahead of unrelated backlog. */
export function affectPublicSite(siteId: string) {
	affectedSites.getStore()?.add(siteId);
}

/** Builds a bounded, redirect-free sender without logging secret headers or response bodies. */
export function revalidationDelivery(
	bindings: RevalidationBindings,
	localUrl?: string,
): Delivery | undefined {
	const secret = bindings.PORTFOLIO_REVALIDATION_SECRET;
	const binding = bindings.PORTFOLIO_REVALIDATION;
	if (!binding && !localUrl) return undefined;
	return async (intent) => {
		try {
			if (!secret || secret.length < 32) throw new Error("CACHE_REVALIDATION_UNCONFIGURED");
			const request = new Request(localUrl ?? `https://portfolio.internal${REVALIDATION_PATH}`, {
				method: "POST",
				headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
				body: JSON.stringify({ ...intent, deliveryId: newId() }),
				signal: AbortSignal.timeout(5000),
				redirect: "manual",
			});
			const response = await (binding ? binding.fetch(request) : fetch(request));
			if (response.status !== 204) throw new Error("CACHE_REVALIDATION_REJECTED");
		} catch (error) {
			await markPending(bindings.PUBLIC_CACHE_SIGNAL);
			throw error;
		}
	};
}

/** Keeps service bindings request-local, like the existing database and Images scopes. */
export function withRevalidationDelivery<T>(delivery: Delivery | undefined, operation: () => T): T {
	return deliveryContext.run(delivery, () => affectedSites.run(new Set(), operation));
}

export const cacheInvalidationService = {
	/** Acknowledges only the generation actually delivered; concurrent newer changes remain pending. */
	async flush(deliver = deliveryContext.getStore(), limit = 20, siteIds?: string[]) {
		if (!deliver) return { delivered: 0, failed: 0, disabled: true };
		if (siteIds?.length === 0) return { delivered: 0, failed: 0, disabled: false };
		const pending = await db
			.select()
			.from(cacheInvalidations)
			.where(
				and(
					lt(cacheInvalidations.deliveredVersion, cacheInvalidations.version),
					siteIds ? inArray(cacheInvalidations.siteId, siteIds) : undefined,
				),
			)
			.orderBy(siteIds ? desc(cacheInvalidations.updatedAt) : asc(cacheInvalidations.updatedAt))
			.limit(limit);
		let delivered = 0;
		let failed = 0;
		for (const intent of pending) {
			try {
				await deliver({ siteId: intent.siteId, slug: intent.slug });
				await db
					.update(cacheInvalidations)
					.set({ deliveredVersion: intent.version, attempts: 0 })
					.where(
						and(
							eq(cacheInvalidations.siteId, intent.siteId),
							eq(cacheInvalidations.slug, intent.slug),
							eq(cacheInvalidations.version, intent.version),
							lt(cacheInvalidations.deliveredVersion, intent.version),
						),
					);
				delivered++;
			} catch {
				await db
					.update(cacheInvalidations)
					.set({ attempts: sql`${cacheInvalidations.attempts} + 1`, updatedAt: new Date() })
					.where(
						and(
							eq(cacheInvalidations.siteId, intent.siteId),
							eq(cacheInvalidations.slug, intent.slug),
						),
					);
				console.error(JSON.stringify({ event: "cache_invalidation_failed" }));
				captureMessage("Cache invalidation failed", {
					level: "error",
					tags: { kind: "cache_invalidation_failed" },
				});
				failed++;
			}
		}
		return { delivered, failed, disabled: false };
	},

	/**
	 * Minute retry. Reads only the R2 signal, so the database (and Neon compute) is touched only
	 * after a failed delivery. The signal is cleared only when the backlog is empty and nobody
	 * re-marked it meanwhile (conditional on the etag read before draining).
	 */
	async retryPending(
		bindings: RevalidationBindings,
		withDatabase: <T>(operation: () => Promise<T>) => Promise<T>,
	) {
		const signal = bindings.PUBLIC_CACHE_SIGNAL;
		const deliver = revalidationDelivery(bindings);
		if (!signal || !deliver) return { skipped: true };
		const marker = await signal.head(PENDING_SIGNAL_KEY);
		if (marker?.customMetadata?.state !== "pending") return { skipped: true };
		return withDatabase(async () => {
			const report = await this.flush(deliver);
			const [remaining] = await db
				.select({ siteId: cacheInvalidations.siteId })
				.from(cacheInvalidations)
				.where(lt(cacheInvalidations.deliveredVersion, cacheInvalidations.version))
				.limit(1);
			if (!remaining)
				await signal.put(PENDING_SIGNAL_KEY, "", {
					customMetadata: { state: "clear" },
					onlyIf: { etagMatches: marker.etag },
				});
			return { ...report, skipped: false, remaining: Boolean(remaining) };
		});
	},

	/** Gives a just-committed mutation priority over the bounded Cron backlog. */
	async flushAffected() {
		const results = [];
		for (const siteId of affectedSites.getStore() ?? [])
			results.push(await this.flush(deliveryContext.getStore(), 20, [siteId]));
		return results;
	},
};
