import { collectAssetIds, type Locale, type PublicSite } from "@ichnara/contracts";
import { notFound } from "next/navigation";
import { cache } from "react";

type PublishedRead = { status: number; result: unknown };

/**
 * Fetches one public release endpoint once per server request, so the root layout, metadata
 * and page share a single API call. Never forwards a private session.
 */
const requestPublished = cache(
	async (slug: string, suffix: string): Promise<PublishedRead | null> => {
		const origin =
			process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
		try {
			const response = await fetch(
				`${origin}/api/public/sites/${encodeURIComponent(slug)}${suffix}`,
				{ cache: "no-store" },
			);
			const data = await response.json().catch(() => null);
			return {
				status: response.status,
				result: response.ok && data?.status && data.result ? data.result : null,
			};
		} catch {
			return null;
		}
	},
);

/** Loads the accessible public release; a missing portfolio renders the not-found boundary. */
export async function readPublished<T>(slug: string, suffix = ""): Promise<T | null> {
	const read = await requestPublished(slug, suffix);
	if (read?.status === 404) notFound();
	return (read?.result as T | null) ?? null;
}

/** Resolves the published portfolio's language, or null when its release cannot be read. */
export async function publishedLocale(slug: string): Promise<Locale | null> {
	const read = await requestPublished(slug, "");
	return (read?.result as PublicSite | null)?.draft.locale ?? null;
}

/** Maps release image references to the guarded public asset gateway. */
export function publicAssets(site: PublicSite): Record<string, string> {
	const origin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
	return Object.fromEntries(
		collectAssetIds(site.draft).map((id) => [
			id,
			`${origin}/api/public/sites/${encodeURIComponent(site.slug)}/assets/${encodeURIComponent(id)}`,
		]),
	);
}

/**
 * Fails the render when the public release cannot be read, so the response carries a
 * server-error status (never a 200 "soft" page) and the route error boundary explains it.
 */
export function releaseUnavailable(): never {
	throw new Error("PUBLIC_RELEASE_UNAVAILABLE");
}
