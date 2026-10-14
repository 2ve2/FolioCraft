import type { PublicSite } from "@folio/contracts";
import { escapeXml, webOrigin } from "../../../../lib/public-metadata";
import { readPublished } from "../_public";

export const dynamic = "force-dynamic";
/** Lists the same currently visible release content used by public pages. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) return new Response("Sitemap temporarily unavailable", { status: 503 });
	const base = `${webOrigin}/p/${encodeURIComponent(site.slug)}`;
	const urls = [
		base,
		...site.draft.projects.map((item) => `${base}/projects/${encodeURIComponent(item.id)}`),
		...(site.draft.articles ?? []).map(
			(item) => `${base}/articles/${encodeURIComponent(item.slug)}`,
		),
	];
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(site.publishedAt)}</lastmod></url>`).join("")}</urlset>`,
		{ headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } },
	);
}
