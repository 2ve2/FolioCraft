"use client";
import type { Skill } from "@ichnara/contracts";
import { CollectionActions } from "./collection-actions";
import { labels } from "./copy";
import { Input } from "./input";
import type { ContentEditorProps } from "./types";

/** Edits categorized skill entries through the shared draft updater. */
export function SkillsEditor({ draft, locale, update }: Omit<ContentEditorProps, "siteId">) {
	const t = labels[locale];

	/** Changes one skill group while preserving all other draft data. */
	const patchSkill = (id: string, patch: Partial<Skill>) =>
		update((d) => ({
			...d,
			skills: (d.skills ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
		}));

	return (
		<section className="editor-card" id="studio-skills">
			<h2>{t.skills}</h2>
			{(draft.skills ?? []).map((x, i) => (
				<div className="collection-item" key={x.id}>
					<CollectionActions
						draft={draft}
						locale={locale}
						update={update}
						collection="skills"
						index={i}
					/>
					<Input
						label={t.category}
						max={100}
						value={x.category}
						onChange={(category) => patchSkill(x.id, { category })}
					/>
					<Input
						label={t.items}
						multiline
						value={x.items.join("\n")}
						onChange={(text) => patchSkill(x.id, { items: text.split("\n") })}
					/>
				</div>
			))}
			<button
				className="secondary"
				type="button"
				disabled={(draft.skills?.length ?? 0) >= 30}
				onClick={() =>
					update((d) => ({
						...d,
						skills: [...(d.skills ?? []), { id: crypto.randomUUID(), category: "", items: [""] }],
					}))
				}
			>
				{t.add} {t.skills}
			</button>
		</section>
	);
}
