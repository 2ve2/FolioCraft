import type { Draft } from "@ichnara/contracts";
import { copy } from "../copy";
import { ExternalLink } from "../external-link";
import { safeHttpUrl } from "../format";
import { LinkArrow } from "../link-arrow";
import { Gallery, RichContent } from "../rich-content";
import type { PortfolioProps } from "../types";

/** Renders project covers, badges, summaries and the unchanged inline detail fallback. */
export function PortfolioProjects({
	draft,
	projects,
	assetUrls = {},
	publicBasePath,
	workAnchor,
}: Pick<PortfolioProps, "draft" | "assetUrls" | "publicBasePath"> & {
	projects: Draft["projects"];
	workAnchor: string;
}) {
	const { appearance, locale } = draft;
	const t = copy[locale];
	return (
		<section className="folio__work" id={workAnchor} aria-label={t.work}>
			<div className="folio__section-heading">
				<div>
					<p className="folio__eyebrow">01 / {t.portfolio}</p>
					<h2>{t.work}</h2>
				</div>
				<p>{t.workIntro}</p>
			</div>
			{projects.length === 0 ? (
				<div className="folio__empty">
					<span aria-hidden="true">＋</span>
					<h3>{t.empty}</h3>
					<p>{t.emptyText}</p>
				</div>
			) : (
				<div className="folio__grid">
					{projects.map((project, index) => {
						const url = safeHttpUrl(project.url);
						const hasDetails = Boolean(
							project.body ||
								project.role ||
								project.tools ||
								project.richBody?.length ||
								project.results ||
								project.galleryAssetIds?.length,
						);
						return (
							<div className="folio__project" key={project.id}>
								{((project.coverAssetId && assetUrls[project.coverAssetId]) ||
									appearance.projectFallbackVisible !== false) && (
									<div className={`folio__art folio__art--${index % 3}`} aria-hidden="true">
										{project.coverAssetId && assetUrls[project.coverAssetId] ? (
											<img className="folio__cover" src={assetUrls[project.coverAssetId]} alt="" />
										) : (
											<>
												<div className="folio__art-orbit" />
												<div className="folio__art-shape" />
												<span className="folio__art-number">
													{String(index + 1).padStart(2, "0")}
												</span>
											</>
										)}
									</div>
								)}
								<div className="folio__project-copy">
									<div className="folio__project-meta">
										<span>{String(index + 1).padStart(2, "0")}</span>
										{project.year && <span dir="auto">{project.year}</span>}
									</div>
									<h3 dir="auto">{project.title}</h3>
									{(project.featured || publicBasePath) && (
										<div className="folio__project-actions">
											{project.featured && <span className="folio__tag">{t.featured}</span>}
											{publicBasePath && (
												<a
													className="folio__arrow-link folio__project-link"
													href={`${publicBasePath}/projects/${encodeURIComponent(project.slug || project.id)}`}
												>
													{t.details} <LinkArrow locale={locale} />
												</a>
											)}
										</div>
									)}
									{project.summary && (
										<p className="folio__summary" dir="auto">
											{project.summary}
										</p>
									)}
									{hasDetails && (
										<details className="folio__details">
											<summary>
												{t.details}
												<span aria-hidden="true">＋</span>
											</summary>
											<div className="folio__detail-body">
												{(project.role || project.tools) && (
													<dl>
														{project.role && (
															<div>
																<dt>{t.role}</dt>
																<dd dir="auto">{project.role}</dd>
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
												<RichContent body={project.body} blocks={project.richBody} />
												{project.results && (
													<div className="folio__rich">
														<h3>{t.results}</h3>
														<p dir="auto">{project.results}</p>
													</div>
												)}
												<Gallery project={project} assetUrls={assetUrls} />
											</div>
										</details>
									)}
									<ExternalLink className="folio__arrow-link folio__project-link" href={url}>
										{t.visit}
										<LinkArrow locale={locale} />
									</ExternalLink>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
