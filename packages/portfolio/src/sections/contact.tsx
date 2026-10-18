import type { Draft, Locale } from "@ichnara/contracts";
import { copy } from "../copy";
import { keyed, safeHttpUrl } from "../format";
import { LinkArrow } from "../link-arrow";
import type { PortfolioProps } from "../types";

/** Renders public contact links and the caller-provided public or preview form. */
export function PortfolioContact({
	locale,
	contactAnchor,
	email,
	website,
	socialLinks,
	contactForm,
}: Pick<PortfolioProps, "contactForm"> & {
	locale: Locale;
	contactAnchor: string;
	email?: string;
	website?: string;
	socialLinks: NonNullable<Draft["profile"]["socialLinks"]>;
}) {
	const t = copy[locale];
	return (
		<section className="folio__contact" id={contactAnchor}>
			<p className="folio__eyebrow">02 / {t.contact}</p>
			<h2>
				{t.contact}
				<span className="folio__period" aria-hidden="true">
					.
				</span>
			</h2>
			<p>{t.contactIntro}</p>
			<div className="folio__contact-links">
				{email && (
					<a className="folio__arrow-link" href={`mailto:${email}`} dir="ltr">
						{email} <LinkArrow locale={locale} />
					</a>
				)}
				{website && (
					<a className="folio__arrow-link" href={website} target="_blank" rel="noopener noreferrer">
						{t.website} <LinkArrow locale={locale} />
					</a>
				)}

				{keyed(socialLinks).map(({ value: item, key }) => (
					<a
						className="folio__arrow-link"
						key={key}
						href={safeHttpUrl(item.url)}
						dir="auto"
						target="_blank"
						rel="noopener noreferrer"
					>
						{item.label} <LinkArrow locale={locale} />
					</a>
				))}
			</div>
			{contactForm}
		</section>
	);
}
