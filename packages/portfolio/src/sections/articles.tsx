import type { Draft, Locale } from "@folio/contracts";
import { copy } from "../copy";
import { readingTime } from "../format";
import { LinkArrow } from "../link-arrow";
import { RichContent } from "../rich-content";
import { SectionHeading } from "../section-elements";
import type { PortfolioProps } from "../types";

/** Renders visible articles and their release-scoped detail links. */
export function PortfolioArticles({
	articles,
	locale,
	assetUrls = {},
	publicBasePath,
	articlesAnchor,
}: Pick<PortfolioProps, "assetUrls" | "publicBasePath"> & {
	articles: NonNullable<Draft["articles"]>;
	locale: Locale;
	articlesAnchor: string;
}) {
	const t = copy[locale];
	return (
		<section className="folio__work" id={articlesAnchor} aria-label={t.articles}>
			<SectionHeading title={t.articles} />
			<div className="folio__grid">
				{articles.map((item) => (
					<div className="folio__project" key={item.id}>
						{item.coverAssetId && assetUrls[item.coverAssetId] && (
							<img
								className="folio__article-cover"
								src={assetUrls[item.coverAssetId]}
								alt=""
								loading="lazy"
							/>
						)}
						<div className="folio__project-copy">
							<p className="folio__eyebrow">{readingTime(item, locale)}</p>
							<h3 dir="auto">{item.title}</h3>
							{item.summary && (
								<p className="folio__summary" dir="auto">
									{item.summary}
								</p>
							)}
							{publicBasePath ? (
								<a
									className="folio__arrow-link folio__project-link"
									href={`${publicBasePath}/articles/${encodeURIComponent(item.slug)}`}
								>
									{t.read} <LinkArrow locale={locale} />
								</a>
							) : (
								<details className="folio__details">
									<summary>
										{t.read}
										<span aria-hidden="true">＋</span>
									</summary>
									<RichContent body={item.body} blocks={item.richBody} />
								</details>
							)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
