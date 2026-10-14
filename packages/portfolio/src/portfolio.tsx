import { getPortfolioStyle } from "./appearance";
import { copy } from "./copy";
import { keyed, readingTime, safeHttpUrl } from "./format";
import { Gallery, RichContent } from "./rich-content";
import { DateRange, SectionHeading } from "./section-elements";
import { portfolioCss as css } from "./styles";

import type { PortfolioProps } from "./types";
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
							<a href={`${detail ? (publicBasePath ?? "") : ""}#${contactAnchor}`}>
								{t.contact}
								<span aria-hidden="true"> ↗</span>
							</a>
						)}
					</div>
				</header>
				{detail}
				{!detail && (hasProfile || compact) && (
					<section className="folio__hero" aria-label={t.portfolio}>
						<div className="folio__identity" aria-hidden="true">
							{profile.imageAssetId && assetUrls[profile.imageAssetId] ? (
								<img src={assetUrls[profile.imageAssetId]} alt="" className="folio__avatar" />
							) : (
								initials || <span className="folio__identity-empty">✦</span>
							)}
						</div>
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
										<a className="folio__button" href={`mailto:${email}`}>
											{t.email}
											<span aria-hidden="true"> ↗</span>
										</a>
									)}
									{website && (
										<a
											className="folio__text-link"
											href={website}
											target="_blank"
											rel="noopener noreferrer"
										>
											{t.website}
											<span aria-hidden="true"> ↗</span>
										</a>
									)}
								</div>
							)}
						</div>
					</section>
				)}
				{!detail && projectsVisible && (projects.length > 0 || compact) && (
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
											<div className={`folio__art folio__art--${index % 3}`} aria-hidden="true">
												{project.coverAssetId && assetUrls[project.coverAssetId] ? (
													<img
														className="folio__cover"
														src={assetUrls[project.coverAssetId]}
														alt=""
													/>
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
											<div className="folio__project-copy">
												<div className="folio__project-meta">
													<span>{String(index + 1).padStart(2, "0")}</span>
													{project.year && <span dir="auto">{project.year}</span>}
												</div>
												<h3 dir="auto">{project.title}</h3>
												{project.featured && <span className="folio__tag">{t.featured}</span>}
												{publicBasePath && (
													<a
														className="folio__project-link"
														href={`${publicBasePath}/projects/${encodeURIComponent(project.slug || project.id)}`}
													>
														{t.details} ↗
													</a>
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
												{url && (
													<a
														className="folio__project-link"
														href={url}
														target="_blank"
														rel="noopener noreferrer"
													>
														{t.visit}
														<span aria-hidden="true"> ↗</span>
													</a>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</section>
				)}

				{!detail && experiences.length > 0 && (
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
				)}
				{!detail && education.length > 0 && (
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
											className="folio__project-link"
											href={safeHttpUrl(item.verificationUrl)}
											target="_blank"
											rel="noopener noreferrer"
										>
											{t.verify} ↗
										</a>
									)}
								</div>
							))}
						</div>
					</section>
				)}
				{!detail && skills.length > 0 && (
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
				)}
				{!detail && articles.length > 0 && (
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
												className="folio__project-link"
												href={`${publicBasePath}/articles/${encodeURIComponent(item.slug)}`}
											>
												{t.read} ↗
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
				)}
				{hasContact && (
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
								<a href={`mailto:${email}`} dir="ltr">
									{email} <span aria-hidden="true">↗</span>
								</a>
							)}
							{website && (
								<a href={website} target="_blank" rel="noopener noreferrer">
									{t.website} <span aria-hidden="true">↗</span>
								</a>
							)}

							{keyed(socialLinks).map(({ value: item, key }) => (
								<a
									key={key}
									href={safeHttpUrl(item.url)}
									dir="auto"
									target="_blank"
									rel="noopener noreferrer"
								>
									{item.label} ↗
								</a>
							))}
						</div>
						{contactForm}
					</section>
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
