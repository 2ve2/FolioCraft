"use client";
import { labels } from "./copy";
import type { ContentEditorProps } from "./types";

/** Changes which content sections appear in the portfolio. */
export function VisibilityEditor({ draft, locale, update }: Omit<ContentEditorProps, "siteId">) {
	const t = labels[locale];
	return (
		<section className="editor-card">
			<h2>{t.visibility}</h2>
			{(["projects", "experiences", "education", "skills", "articles", "contact"] as const).map(
				(key) => (
					<label className="toggle-field" key={key}>
						<input
							type="checkbox"
							checked={
								draft.sectionVisibility?.[key] ??
								(key === "projects" ? draft.appearance.projectsVisible : true)
							}
							onChange={(e) => {
								const checked = e.target.checked;
								update((d) => ({
									...d,
									sectionVisibility: { ...d.sectionVisibility, [key]: checked },
									appearance:
										key === "projects"
											? { ...d.appearance, projectsVisible: checked }
											: d.appearance,
								}));
							}}
						/>
						<span>{t[key]}</span>
					</label>
				),
			)}
		</section>
	);
}
