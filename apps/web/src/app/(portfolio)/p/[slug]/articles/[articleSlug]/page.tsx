import type { Article, PublicSite } from "@ichnara/contracts";
import { PortfolioDetail } from "@ichnara/portfolio";
import { PublishedShell } from "../../../../../../features/portfolio/published-shell";
import { ReportForm } from "../../../../../../features/portfolio/report-form";
import { publishedMetadata } from "../../../../../../lib/public-metadata";
import { publicAssets, readPublished, releaseUnavailable } from "../../_public";

export const dynamic = "force-dynamic";

/** Builds metadata from the accessible published release only. */
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

/** Renders one article from the matching public release. */
export default async function PublicArticle({
	params,
}: {
	params: Promise<{ slug: string; articleSlug: string }>;
}) {
	const { slug, articleSlug } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) releaseUnavailable();
	const detail = await readPublished<{ releaseId: string; article: Article }>(
		slug,
		`/articles/${encodeURIComponent(articleSlug)}`,
	);
	// A release switch between the two reads is transient: report it as unavailable.
	if (!detail || detail.releaseId !== site.releaseId) releaseUnavailable();
	return (
		<PublishedShell locale={site.draft.locale}>
			<PortfolioDetail
				draft={site.draft}
				reportAction={<ReportForm slug={site.slug} locale={site.draft.locale} />}
				article={detail.article}
				assetUrls={publicAssets(site)}
				publicBasePath={`/p/${encodeURIComponent(site.slug)}`}
			/>
		</PublishedShell>
	);
}
