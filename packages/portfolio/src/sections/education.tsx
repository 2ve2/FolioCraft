import type { Draft, Locale } from "@ichnara/contracts";
import { copy } from "../copy";
import { safeHttpUrl } from "../format";
import { LinkArrow } from "../link-arrow";
import { DateRange, SectionHeading } from "../section-elements";

/** Renders education and allowed verification links. */
export function PortfolioEducation({
	education,
	locale,
}: {
	education: NonNullable<Draft["education"]>;
	locale: Locale;
}) {
	const t = copy[locale];
	return (
		<section className="folio__work" aria-label={t.education}>
			<SectionHeading title={t.education} />
			<div className="folio__timeline">
				{education.map((item) => (
					<div className="folio__entry" key={item.id}>
						<p className="folio__eyebrow">
							<DateRange start={item.startDate} end={item.endDate} locale={locale} />
						</p>
						<h3 dir="auto">{item.qualification}</h3>
						<p className="folio__role" dir="auto">
							{item.organization}
						</p>
						{item.description && (
							<p className="folio__body" dir="auto">
								{item.description}
							</p>
						)}
						{safeHttpUrl(item.verificationUrl) && (
							<a
								className="folio__arrow-link folio__project-link"
								href={safeHttpUrl(item.verificationUrl)}
								target="_blank"
								rel="noopener noreferrer"
							>
								{t.verify} <LinkArrow locale={locale} />
							</a>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
