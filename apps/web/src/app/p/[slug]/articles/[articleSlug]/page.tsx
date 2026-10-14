import type { Article, PublicSite } from "@folio/contracts";
import { PortfolioDetail } from "@folio/portfolio";
import { publishedMetadata } from "../../../../../lib/public-metadata";
import { PublicUnavailable, publicAssets, readPublished } from "../../_public";
export const dynamic = "force-dynamic";
export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string; articleSlug: string }>;
}) {
	const { slug, articleSlug } = await params;
	const site = await readPublished<PublicSite>(slug);
	const article = site?.draft.articles?.find((item) => item.slug === articleSlug);
	return site && article
		? publishedMetadata(
				site,
				`/p/${encodeURIComponent(site.slug)}/articles/${encodeURIComponent(article.slug)}`,
				`${article.title} — ${site.draft.profile.name}`,
				article.summary,
				article.coverAssetId,
				true,
			)
		: { robots: { index: false, follow: false } };
}
export default async function PublicArticle({
	params,
}: {
	params: Promise<{ slug: string; articleSlug: string }>;
}) {
	const { slug, articleSlug } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) return <PublicUnavailable />;
	const detail = await readPublished<{ releaseId: string; article: Article }>(
		slug,
		`/articles/${encodeURIComponent(articleSlug)}`,
	);
	if (!detail || detail.releaseId !== site.releaseId) return <PublicUnavailable />;
	return (
		<PortfolioDetail
			draft={site.draft}
			article={detail.article}
			assetUrls={publicAssets(site)}
			publicBasePath={`/p/${encodeURIComponent(site.slug)}`}
		/>
	);
}
