import type { Locale } from "@ichnara/contracts";
import { copy } from "../copy";

/** Keeps the fixed content heading/navigation geometry identical before and after draft arrival. */
export function ContentHeader({ locale, loading = false }: { locale: Locale; loading?: boolean }) {
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
					<a
						key={item.id}
						href={loading ? undefined : `#studio-${item.id}`}
						aria-disabled={loading || undefined}
						tabIndex={loading ? -1 : undefined}
					>
						{locale === "ar" ? item.ar : item.en}
					</a>
				))}
			</nav>
		</>
	);
}
