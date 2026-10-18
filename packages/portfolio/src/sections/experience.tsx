import type { Draft, Locale } from "@ichnara/contracts";
import { copy } from "../copy";
import { keyed } from "../format";
import { DateRange, SectionHeading } from "../section-elements";

/** Renders experience dates, organizations and accomplishments. */
export function PortfolioExperience({
	experiences,
	locale,
}: {
	experiences: NonNullable<Draft["experiences"]>;
	locale: Locale;
}) {
	const t = copy[locale];
	return (
		<section className="folio__work" aria-label={t.experiences}>
			<SectionHeading title={t.experiences} />
			<div className="folio__timeline">
				{experiences.map((item) => (
					<div className="folio__entry" key={item.id}>
						<p className="folio__eyebrow">
							<DateRange
								start={item.startDate}
								end={item.endDate}
								locale={locale}
								current={item.current}
							/>
						</p>
						<h3 dir="auto">{item.role}</h3>
						<p className="folio__role" dir="auto">
							{item.organization}
						</p>
						{item.description && (
							<p className="folio__body" dir="auto">
								{item.description}
							</p>
						)}
						{item.accomplishments?.length ? (
							<ul>
								{keyed(item.accomplishments).map(({ value: text, key }) => (
									<li key={key} dir="auto">
										{text}
									</li>
								))}
							</ul>
						) : null}
					</div>
				))}
			</div>
		</section>
	);
}
