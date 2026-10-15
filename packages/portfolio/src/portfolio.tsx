import { getPortfolioStyle } from "./appearance";
import { copy } from "./copy";
import { safeHttpUrl } from "./format";
import { LinkArrow } from "./link-arrow";
import { PortfolioArticles } from "./sections/articles";
import { PortfolioContact } from "./sections/contact";
import { PortfolioEducation } from "./sections/education";
import { PortfolioExperience } from "./sections/experience";
import { PortfolioHero } from "./sections/hero";
import { PortfolioProjects } from "./sections/projects";
import { PortfolioSkills } from "./sections/skills";
import { portfolioCss as css } from "./styles";

import type { PortfolioProps } from "./types";

/** Composes the fixed portfolio sections for both preview and public releases. */
export function Portfolio({
	draft,
	compact = false,
	assetUrls = {},
	publicBasePath,
	contactForm,
	detail,
	anchorPrefix = "",
}: PortfolioProps) {
	const workAnchor = `${anchorPrefix}folio-work`;
	const contactAnchor = `${anchorPrefix}folio-contact`;
	const articlesAnchor = `${anchorPrefix}folio-articles`;
	const { profile, appearance, locale } = draft;
	const projects = draft.projects;
	const visibility = draft.sectionVisibility;
	const projectsVisible = appearance.projectsVisible && visibility?.projects !== false;
	const contactVisible = visibility?.contact !== false;
	const experiences = visibility?.experiences === false ? [] : (draft.experiences ?? []);
	const education = visibility?.education === false ? [] : (draft.education ?? []);
	const skills = visibility?.skills === false ? [] : (draft.skills ?? []);
	const articles =
		visibility?.articles === false
			? []
			: (draft.articles ?? []).filter((article) => article.published);
	const socialLinks = contactVisible
		? (profile.socialLinks ?? []).filter((item) => safeHttpUrl(item.url))
		: [];
	const t = copy[locale];
	const style = getPortfolioStyle(appearance);
	const website = contactVisible ? safeHttpUrl(profile.website) : undefined;
	const email =
		contactVisible && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ? profile.email : undefined;
	const initials = profile.name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => Array.from(word)[0])
		.join("");
	const hasProfile = Boolean(profile.name || profile.role || profile.bio);
	const hasContact =
		contactVisible && Boolean(email || website || socialLinks.length || contactForm);
	return (
		<article
			className={`folio${compact ? " folio--compact" : ""}`}
			style={style}
			lang={locale}
			dir={locale === "ar" ? "rtl" : "ltr"}
		>
			<style>{css}</style>
			<div className="folio__wrap">
				<header className="folio__nav">
					<span className="folio__brand">
						<span className="folio__brand-mark" aria-hidden="true" />
						{publicBasePath ? (
							<a href={publicBasePath}>{profile.name || t.portfolio}</a>
						) : (
							profile.name || t.portfolio
						)}
					</span>
					<div className="folio__nav-links">
						{projectsVisible && projects.length > 0 && (
							<a href={`${detail ? (publicBasePath ?? "") : ""}#${workAnchor}`}>{t.work}</a>
						)}
						{hasContact && (
							<a
								className="folio__arrow-link"
								href={`${detail ? (publicBasePath ?? "") : ""}#${contactAnchor}`}
							>
								{t.contact}
								<LinkArrow locale={locale} />
							</a>
						)}
					</div>
				</header>
				{detail}
				{!detail && (hasProfile || compact) && (
					<PortfolioHero
						draft={draft}
						assetUrls={assetUrls}
						compact={compact}
						hasProfile={hasProfile}
						hasContact={hasContact}
						email={email}
						website={website}
						initials={initials}
					/>
				)}
				{!detail && projectsVisible && (projects.length > 0 || compact) && (
					<PortfolioProjects
						draft={draft}
						projects={projects}
						assetUrls={assetUrls}
						publicBasePath={publicBasePath}
						workAnchor={workAnchor}
					/>
				)}

				{!detail && experiences.length > 0 && (
					<PortfolioExperience experiences={experiences} locale={locale} />
				)}
				{!detail && education.length > 0 && (
					<PortfolioEducation education={education} locale={locale} />
				)}
				{!detail && skills.length > 0 && <PortfolioSkills skills={skills} locale={locale} />}
				{!detail && articles.length > 0 && (
					<PortfolioArticles
						articles={articles}
						locale={locale}
						assetUrls={assetUrls}
						publicBasePath={publicBasePath}
						articlesAnchor={articlesAnchor}
					/>
				)}
				{hasContact && (
					<PortfolioContact
						locale={locale}
						contactAnchor={contactAnchor}
						email={email}
						website={website}
						socialLinks={socialLinks}
						contactForm={contactForm}
					/>
				)}
				<footer className="folio__footer">
					<span>{profile.name || t.portfolio}</span>
					<span>{t.end}</span>
				</footer>
			</div>
		</article>
	);
}

/** Text blocks have no IDs; content plus duplicate occurrence keeps keys deterministic. */
