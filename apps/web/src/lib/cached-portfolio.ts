import { draftSchema, idSchema, type Locale, type PublicSite } from "@ichnara/contracts";
import { PUBLIC_CACHE_TAG_PREFIX, portfolioTags } from "@ichnara/contracts/public-cache";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";

type CacheableSite = PublicSite & { siteId: string };
class UncacheableRead extends Error {
	constructor(readonly status: number) {
		super("PUBLIC_RELEASE_UNCACHEABLE");
	}
}

/** Only a successful validated release can return from the cache scope; failures never become data entries. */
const requestSite = cache(
	async (slug: string): Promise<{ status: number; site: CacheableSite | null }> => {
		try {
			const site = await unstable_cache(
				async () => {
					const origin =
						process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
					const response = await fetch(
						`${origin}/api/public/sites/${encodeURIComponent(slug)}/cache`,
						{ cache: "no-store" },
					);
					if (response.status !== 200 || response.headers.has("set-cookie"))
						throw new UncacheableRead(response.status === 404 ? 404 : 503);
					const data = await response.json();
					const site = data?.status && data.result;
					if (
						!site ||
						site.slug !== slug ||
						!idSchema.safeParse(site.siteId).success ||
						!idSchema.safeParse(site.releaseId).success ||
						!draftSchema.safeParse(site.draft).success
					)
						throw new UncacheableRead(503);
					return site as CacheableSite;
				},
				["ichnara-published-release", slug],
				{ tags: [`${PUBLIC_CACHE_TAG_PREFIX}slug:${slug}`], revalidate: false },
			)();
			// Collect both identities on the full-route entry; Workers deliberately do not persist data entries.
			await unstable_cache(async () => true, ["ichnara-published-tags", site.siteId, slug], {
				tags: portfolioTags(site.siteId, slug),
				revalidate: false,
			})();
			return { status: 200, site };
		} catch (error) {
			// The Worker rejects this render for caching and falls back to the original dynamic route.
			return { status: error instanceof UncacheableRead ? error.status : 503, site: null };
		}
	},
);

/** Resolves release language without reading visitor headers on a successful published render. */
export async function cachedPublishedLocale(slug: string): Promise<Locale | null> {
	return (await requestSite(slug)).site?.draft.locale ?? null;
}

/** Projects details from the same immutable snapshot; a missing detail is dynamic and uncached. */
export async function readCachedPublished<T>(slug: string, suffix = ""): Promise<T | null> {
	const { status, site } = await requestSite(slug);
	if (status === 404) notFound();
	if (!site) return null;
	if (!suffix) return site as T;
	const [, kind, encoded] = suffix.split("/");
	const requested = decodeURIComponent(encoded ?? "");
	const value =
		kind === "projects"
			? (site.draft.projects.find((item) => item.id === requested) ??
				site.draft.projects.find((item) => item.slug === requested))
			: site.draft.articles?.find((item) => item.slug === requested);
	if (!value) notFound();
	return { releaseId: site.releaseId, [kind === "projects" ? "project" : "article"]: value } as T;
}
