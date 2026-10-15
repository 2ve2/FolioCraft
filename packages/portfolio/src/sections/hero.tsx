import { copy } from "../copy";
import { LinkArrow } from "../link-arrow";
import type { PortfolioProps } from "../types";

/** Renders identity and introductory contact actions without owning draft state. */
export function PortfolioHero({
	draft,
	assetUrls = {},
	compact = false,
	hasProfile,
	hasContact,
	email,
	website,
	initials,
}: Pick<PortfolioProps, "draft" | "assetUrls" | "compact"> & {
	hasProfile: boolean;
	hasContact: boolean;
	email?: string;
	website?: string;
	initials: string;
}) {
	const { profile, appearance, locale } = draft;
	const t = copy[locale];
	return (
		<section className="folio__hero" aria-label={t.portfolio}>
			{appearance.profileVisualVisible !== false && (
				<div className="folio__identity" aria-hidden="true">
					{profile.imageAssetId && assetUrls[profile.imageAssetId] ? (
						<img src={assetUrls[profile.imageAssetId]} alt="" className="folio__avatar" />
					) : (
						initials || <span className="folio__identity-empty">✦</span>
					)}
				</div>
			)}
			<div className="folio__hero-copy">
				{profile.available && (
					<div className="folio__availability">
						<span aria-hidden="true" />
						{t.available}
					</div>
				)}
				{compact && !hasProfile && <p className="folio__eyebrow">{t.preview}</p>}
				{(profile.name || compact) && (
					<h1 dir="auto">
						{profile.name || t.name}
						<span className="folio__period" aria-hidden="true">
							.
						</span>
					</h1>
				)}
				{(profile.role || compact) && (
					<p className="folio__role" dir="auto">
						{profile.role || t.title}
					</p>
				)}
				{(profile.bio || compact) && (
					<p className="folio__bio" dir="auto">
						{profile.bio || t.bio}
					</p>
				)}
				{profile.location && (
					<p className="folio__location" dir="auto">
						<span aria-hidden="true">⌖</span> {profile.location}
					</p>
				)}
				{hasContact && (
					<div className="folio__hero-links">
						{email && (
							<a className="folio__arrow-link folio__button" href={`mailto:${email}`}>
								{t.email}
								<LinkArrow locale={locale} />
							</a>
						)}
						{website && (
							<a
								className="folio__arrow-link folio__text-link"
								href={website}
								target="_blank"
								rel="noopener noreferrer"
							>
								{t.website}
								<LinkArrow locale={locale} />
							</a>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
