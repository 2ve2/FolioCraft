import { escapeXml, webOrigin } from "../../lib/public-metadata";

export const dynamic = "force-dynamic";

/** Builds a sitemap index from bounded public-only API pages; failures never become a fake empty index. */
export async function GET() {
	const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
	const entries: string[] = [];
	let cursor: string | null = null;
	try {
		do {
			const response: Response = await fetch(
				`${api}/api/public/sitemap${cursor ? `?after=${encodeURIComponent(cursor)}` : ""}`,
				{ cache: "no-store" },
			);
			const page: {
				status?: boolean;
				result?: { sites: { slug: string; publishedAt: string }[]; nextCursor: string | null };
			} = await response.json();
			if (!response.ok || !page.status || !page.result || !Array.isArray(page.result.sites))
				throw new Error("Sitemap unavailable");
			for (const site of page.result.sites as { slug: string; publishedAt: string }[]) {
				entries.push(
					`<sitemap><loc>${escapeXml(`${webOrigin}/p/${encodeURIComponent(site.slug)}/sitemap.xml`)}</loc><lastmod>${escapeXml(site.publishedAt)}</lastmod></sitemap>`,
				);
			}
			const next: string | null = page.result.nextCursor;
			if (entries.length > 50000 || (next && next === cursor))
				throw new Error("Sitemap index requires sharding");
			cursor = next;
		} while (cursor);
		return new Response(
			`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</sitemapindex>`,
			{
				headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
			},
		);
	} catch {
		return new Response("Sitemap temporarily unavailable", {
			status: 503,
			headers: { "Cache-Control": "no-store" },
		});
	}
}
