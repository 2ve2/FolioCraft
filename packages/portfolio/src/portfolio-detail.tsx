import type { Article, Project } from "@ichnara/contracts";
import { copy } from "./copy";
import { readingTime, safeHttpUrl } from "./format";
import { LinkArrow } from "./link-arrow";
import { Portfolio } from "./portfolio";
import { Gallery, RichContent } from "./rich-content";
import type { PortfolioProps } from "./types";

/** Composes a project or article detail inside the shared portfolio shell. */
export function PortfolioDetail({
	draft,
	project,
	article,
	assetUrls = {},
	publicBasePath,
	anchorPrefix,
}: Pick<PortfolioProps, "draft" | "assetUrls" | "publicBasePath" | "anchorPrefix"> & {
	project?: Project;
	article?: Article;
}) {
	const item = project ?? article;
	if (!item) return null;
	const t = copy[draft.locale];
	const url = project && safeHttpUrl(project.url);
	return (
		<Portfolio
			draft={draft}
			assetUrls={assetUrls}
			publicBasePath={publicBasePath}
			anchorPrefix={anchorPrefix}
			detail={
				<section className="folio__detail-page">
					{publicBasePath && (
						<a className="folio__text-link" href={publicBasePath}>
							{t.back}
						</a>
					)}
					{article && <p className="folio__eyebrow">{readingTime(article, draft.locale)}</p>}
					<h1 dir="auto" tabIndex={-1}>
						{item.title}
						<span className="folio__period">.</span>
					</h1>
					{item.summary && (
						<p className="folio__bio" dir="auto">
							{item.summary}
						</p>
					)}
					{item.coverAssetId && assetUrls[item.coverAssetId] && (
						<img className="folio__detail-cover" src={assetUrls[item.coverAssetId]} alt="" />
					)}
					{project && (
						<dl>
							{project.role && (
								<div>
									<dt>{t.role}</dt>
									<dd dir="auto">{project.role}</dd>
								</div>
							)}
							{project.year && (
								<div>
									<dt>{t.year}</dt>
									<dd dir="auto">{project.year}</dd>
								</div>
							)}
							{project.tools && (
								<div>
									<dt>{t.tools}</dt>
									<dd dir="auto">{project.tools}</dd>
								</div>
							)}
						</dl>
					)}
					<RichContent body={item.body} blocks={item.richBody} />
					{project?.results && (
						<div className="folio__rich">
							<h2>{t.results}</h2>
							<p dir="auto">{project.results}</p>
						</div>
					)}
					{project && <Gallery project={project} assetUrls={assetUrls} />}
					{url && (
						<a
							className="folio__arrow-link folio__project-link"
							href={url}
							target="_blank"
							rel="noopener noreferrer"
						>
							{t.visit} <LinkArrow locale={draft.locale} />
						</a>
					)}
				</section>
			}
		/>
	);
}
