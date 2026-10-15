import { ContentEditors } from "../../content/content-editors";
import { copy } from "../copy";
import type { EditorSectionProps } from "../types";
import { ProfileSection } from "./profile-section";
import { ProjectsSection } from "./projects-section";

/** Composes content navigation and responsibility-specific editor sections. */
export function ContentSection(props: EditorSectionProps & { setError: (error: string) => void }) {
	const { draft, site, locale, update } = props;
	const t = copy[locale];
	return (
		<>
			<div className="section-heading">
				<span className="eyebrow">01 / {t.content}</span>
				<h1>{t.profile}</h1>
				<p>{t.profileDesc}</p>
			</div>
			<nav
				className="content-jump-nav"
				aria-label={locale === "ar" ? "أقسام المحتوى" : "Content sections"}
			>
				{[
					{ id: "profile", ar: "النبذة", en: "Profile" },
					{ id: "projects", ar: "المشاريع", en: "Projects" },
					{ id: "experiences", ar: "الخبرات", en: "Experience" },
					{ id: "education", ar: "التعليم", en: "Education" },
					{ id: "skills", ar: "المهارات", en: "Skills" },
					{ id: "articles", ar: "المقالات", en: "Articles" },
				].map((item) => (
					<a key={item.id} href={`#studio-${item.id}`}>
						{locale === "ar" ? item.ar : item.en}
					</a>
				))}
			</nav>
			<ProfileSection draft={draft} site={site} locale={locale} update={update} />
			<ProjectsSection {...props} />
			<ContentEditors draft={draft} siteId={site.id} locale={locale} update={update} />
		</>
	);
}
