import type { PublicSite } from "@folio/contracts";
import { Portfolio } from "@folio/portfolio";
import { InquiryForm } from "../../../features/portfolio/inquiry-form";
import { publishedMetadata } from "../../../lib/public-metadata";
import { PublicUnavailable, publicAssets, readPublished } from "./_public";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const site = await readPublished<PublicSite>(slug);
	return site
		? publishedMetadata(site, `/p/${encodeURIComponent(site.slug)}`)
		: { robots: { index: false, follow: false } };
}
export default async function PublicPortfolio({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) return <PublicUnavailable />;
	return (
		<Portfolio
			draft={site.draft}
			assetUrls={publicAssets(site)}
			publicBasePath={`/p/${encodeURIComponent(site.slug)}`}
			contactForm={<InquiryForm slug={site.slug} locale={site.draft.locale} />}
		/>
	);
}
