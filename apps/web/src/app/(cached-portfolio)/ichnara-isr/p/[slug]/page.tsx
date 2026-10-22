import type { PublicSite } from "@ichnara/contracts";
import { Portfolio } from "@ichnara/portfolio";
import { InquiryForm } from "../../../../../features/portfolio/inquiry-form";
import { PublishedShell } from "../../../../../features/portfolio/published-shell";
import { ReportForm } from "../../../../../features/portfolio/report-form";
import { readCachedPublished as readPublished } from "../../../../../lib/cached-portfolio";
import { publishedMetadata } from "../../../../../lib/public-metadata";
import { publicAssets, releaseUnavailable } from "../../../../(portfolio)/p/[slug]/_public";

export const revalidate = false;

/** Enables on-demand ISR without prerendering unknown/missing portfolios at build time. */
export function generateStaticParams() {
	return [];
}

/** Builds metadata from the accessible published release only. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const site = await readPublished<PublicSite>(slug);
	return site
		? publishedMetadata(site, `/p/${encodeURIComponent(site.slug)}`)
		: { robots: { index: false, follow: false } };
}

/** Renders the public release or its explicit unavailable state. */
export default async function PublicPortfolio({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) releaseUnavailable();
	return (
		<PublishedShell locale={site.draft.locale}>
			<Portfolio
				draft={site.draft}
				reportAction={<ReportForm slug={site.slug} locale={site.draft.locale} />}
				assetUrls={publicAssets(site)}
				publicBasePath={`/p/${encodeURIComponent(site.slug)}`}
				contactForm={<InquiryForm slug={site.slug} locale={site.draft.locale} />}
			/>
		</PublishedShell>
	);
}
