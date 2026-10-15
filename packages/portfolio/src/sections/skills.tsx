import type { Draft, Locale } from "@folio/contracts";
import { copy } from "../copy";
import { keyed } from "../format";
import { SectionHeading } from "../section-elements";

/** Renders skill categories and stable keyed skill labels. */
export function PortfolioSkills({
	skills,
	locale,
}: {
	skills: NonNullable<Draft["skills"]>;
	locale: Locale;
}) {
	const t = copy[locale];
	return (
		<section className="folio__work" aria-label={t.skills}>
			<SectionHeading title={t.skills} />
			<div className="folio__grid folio__skills-grid">
				{skills.map((item) => (
					<div className="folio__entry folio__skill-group" key={item.id}>
						<h3 dir="auto">{item.category}</h3>
						<ul className="folio__tags">
							{keyed(item.items).map(({ value: text, key }) => (
								<li className="folio__tag" key={key} dir="auto">
									{text}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</section>
	);
}
