import type { Draft, Locale } from "@ichnara/contracts";
import { copy } from "../copy";
import { ExternalLink } from "../external-link";
import { keyed } from "../format";
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
				<ExternalLink className="folio__arrow-link" href={website}>
					{t.website} <LinkArrow locale={locale} />
				</ExternalLink>

				{keyed(socialLinks).map(({ value: item, key }) => (
					<ExternalLink className="folio__arrow-link" key={key} href={item.url} dir="auto">
						{item.label} <LinkArrow locale={locale} />
					</ExternalLink>
				))}
			</div>
			{contactForm}
		</section>
	);
}
