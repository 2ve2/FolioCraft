import { ContentEditors } from "../../content/content-editors";
import type { EditorSectionProps } from "../types";
import { ContentHeader } from "./content-header";
import { ProfileSection } from "./profile-section";
import { ProjectsSection } from "./projects-section";

/** Composes content navigation and responsibility-specific editor sections. */
export function ContentSection(props: EditorSectionProps & { setError: (error: string) => void }) {
	const { draft, site, locale, update } = props;
	return (
		<>
			<ContentHeader locale={locale} />
			<ProfileSection draft={draft} site={site} locale={locale} update={update} />
			<ProjectsSection {...props} />
			<ContentEditors draft={draft} siteId={site.id} locale={locale} update={update} />
		</>
	);
}
