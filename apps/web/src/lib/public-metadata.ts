import type { PublicSite } from "@ichnara/contracts";
import type { Metadata } from "next";

export const webOrigin = new URL(process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000").origin;

/** Uses only published content for search/share identity; never reads editor state. */
export function publishedMetadata(
	site: PublicSite,
	path: string,
	title = `${site.draft.profile.name} — ${site.draft.profile.role}`,
	description = site.draft.profile.bio,
	cover = site.draft.profile.imageAssetId,
	article = false,
): Metadata {
	const url = `${webOrigin}${path}`;
	const summary = (description || site.draft.profile.role)
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 160);
	const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
	const image = cover
		? `${apiOrigin}/api/public/sites/${encodeURIComponent(site.slug)}/assets/${encodeURIComponent(cover)}`
		: undefined;
	return {
		title,
		description: summary,
		alternates: { canonical: url },
		robots: { index: true, follow: true },
		openGraph: {
			title,
			description: summary,
			url,
			type: article ? "article" : "website",
			locale: site.draft.locale === "ar" ? "ar_SA" : "en_US",
			...(image ? { images: [{ url: image, alt: title }] } : {}),
		},
		twitter: {
			card: image ? "summary_large_image" : "summary",
			title,
			description: summary,
			...(image ? { images: [image] } : {}),
		},
	};
}

/** Escapes XML text independently of URL encoding. */
export const escapeXml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
