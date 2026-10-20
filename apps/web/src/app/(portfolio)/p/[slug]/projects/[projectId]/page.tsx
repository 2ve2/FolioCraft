import type { Project, PublicSite } from "@ichnara/contracts";
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
	params: Promise<{ slug: string; projectId: string }>;
}) {
	const { slug, projectId } = await params;
	const site = await readPublished<PublicSite>(slug);
	const project = site?.draft.projects.find(
		(item) => item.id === projectId || item.slug === projectId,
	);
	return site && project
		? publishedMetadata(
				site,
				`/p/${encodeURIComponent(site.slug)}/projects/${encodeURIComponent(project.id)}`,
				`${project.title} — ${site.draft.profile.name}`,
				project.summary,
				project.coverAssetId,
			)
		: { robots: { index: false, follow: false } };
}

/** Renders one project from the matching public release. */
export default async function PublicProject({
	params,
}: {
	params: Promise<{ slug: string; projectId: string }>;
}) {
	const { slug, projectId } = await params;
	const site = await readPublished<PublicSite>(slug);
	if (!site) releaseUnavailable();
	const detail = await readPublished<{ releaseId: string; project: Project }>(
		slug,
		`/projects/${encodeURIComponent(projectId)}`,
	);
	// A release switch between the two reads is transient: report it as unavailable.
	if (!detail || detail.releaseId !== site.releaseId) releaseUnavailable();
	return (
		<PublishedShell locale={site.draft.locale}>
			<PortfolioDetail
				draft={site.draft}
				reportAction={<ReportForm slug={site.slug} locale={site.draft.locale} />}
				project={detail.project}
				assetUrls={publicAssets(site)}
				publicBasePath={`/p/${encodeURIComponent(site.slug)}`}
			/>
		</PublishedShell>
	);
}
