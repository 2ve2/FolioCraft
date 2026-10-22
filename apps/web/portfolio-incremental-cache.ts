import { PUBLIC_CACHE_PREFIX } from "@ichnara/contracts/public-cache";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { portfolioRenderStart } from "./cache-scope";

/** Accepts legacy/scoped Next route keys only for the internal portfolio document tree. */
export function portfolioCacheKey(key: string) {
	const path = key.replace(/^\/?route-cache\/APP_PAGE\/[0-9a-f]{64}\/\$/, "");
	return path.startsWith(`${PUBLIC_CACHE_PREFIX}/p/`);
}

/** Filters the official R2 cache to published HTML; no data, errors, redirects or other routes persist. */
const cache: Pick<typeof r2IncrementalCache, "get" | "set" | "delete"> & { name: string } = {
	// Avoid the CLI's broad R2 seeding: this cache contains only runtime published portfolios.
	name: "ichnara-portfolio-r2",
	get: (async (key, type) => {
		if ((type ?? "cache") !== "cache" || !portfolioCacheKey(key)) return null;
		const entry = await r2IncrementalCache.get(key, type);
		const start = (entry?.value as { ichnaraRenderStartedAt?: number } | undefined)
			?.ichnaraRenderStartedAt;
		if (!entry?.value || !start) return null;
		return { ...entry, lastModified: start };
	}) as typeof r2IncrementalCache.get,
	set: (async (key, value, type) => {
		const start = portfolioRenderStart();
		if ((type ?? "cache") !== "cache" || !portfolioCacheKey(key) || !start) return;
		const page = value as {
			type?: string;
			meta?: { status?: number; headers?: Record<string, unknown> };
		};
		if (page.type !== "app" || (page.meta?.status ?? 200) !== 200) return;
		if (
			Object.keys(page.meta?.headers ?? {}).some((header) => header.toLowerCase() === "set-cookie")
		)
			return;
		await r2IncrementalCache.set(
			key,
			{ ...value, ichnaraRenderStartedAt: start } as typeof value,
			type,
		);
	}) as typeof r2IncrementalCache.set,
	delete: (key) => (portfolioCacheKey(key) ? r2IncrementalCache.delete(key) : Promise.resolve()),
};

export default cache;
