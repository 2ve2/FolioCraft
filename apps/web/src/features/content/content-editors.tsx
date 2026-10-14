"use client";
import { ArticlesEditor } from "./articles-editor";
import { EducationEditor } from "./education-editor";
import { ExperiencesEditor } from "./experiences-editor";
import { SkillsEditor } from "./skills-editor";
import type { ContentEditorProps } from "./types";
import { VisibilityEditor } from "./visibility-editor";

/** Keeps collection ordering and visibility consistent across the content workspace. */
export function ContentEditors(props: ContentEditorProps) {
	return (
		<>
			<VisibilityEditor {...props} />
			<ExperiencesEditor {...props} />
			<EducationEditor {...props} />
			<SkillsEditor {...props} />
			<ArticlesEditor {...props} />
		</>
	);
}
