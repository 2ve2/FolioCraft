"use client";
import type { Experience } from "@ichnara/contracts";
import { CollectionActions } from "./collection-actions";
import { labels } from "./copy";
import { Input } from "./input";
import type { ContentEditorProps } from "./types";

/** Edits ordered experience entries through the shared draft updater. */
export function ExperiencesEditor({ draft, locale, update }: Omit<ContentEditorProps, "siteId">) {
	const t = labels[locale];

	/** Changes one experience entry while preserving all other draft data. */
	const patchExperience = (id: string, patch: Partial<Experience>) =>
		update((d) => ({
			...d,
			experiences: (d.experiences ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
		}));

	return (
		<section className="editor-card" id="studio-experiences">
			<h2>{t.experiences}</h2>
			{(draft.experiences ?? []).map((x, i) => (
				<div className="collection-item" key={x.id}>
					<CollectionActions
						draft={draft}
						locale={locale}
						update={update}
						collection="experiences"
						index={i}
					/>
					<Input
						label={t.organization}
						max={160}
						value={x.organization}
						onChange={(organization) => patchExperience(x.id, { organization })}
					/>
					<Input
						label={t.role}
						max={140}
						value={x.role}
						onChange={(role) => patchExperience(x.id, { role })}
					/>
					<div className="two-fields">
						<Input
							label={t.start}
							type="date"
							value={x.startDate}
							onChange={(startDate) => patchExperience(x.id, { startDate })}
						/>
						{!x.current && (
							<Input
								label={t.end}
								type="date"
								value={x.endDate ?? ""}
								onChange={(endDate) => patchExperience(x.id, { endDate: endDate || null })}
							/>
						)}
					</div>
					<label className="toggle-field">
						<input
							type="checkbox"
							checked={x.current}
							onChange={(e) =>
								patchExperience(x.id, {
									current: e.target.checked,
									endDate: e.target.checked ? null : x.endDate,
								})
							}
						/>
						<span>{t.current}</span>
					</label>
					<Input
						label={t.description}
						multiline
						value={x.description}
						onChange={(description) => patchExperience(x.id, { description })}
					/>
					<Input
						label={t.accomplishments}
						multiline
						value={(x.accomplishments ?? []).join("\n")}
						onChange={(text) =>
							patchExperience(x.id, { accomplishments: text ? text.split("\n") : [] })
						}
					/>
				</div>
			))}
			<button
				className="secondary"
				type="button"
				disabled={(draft.experiences?.length ?? 0) >= 50}
				onClick={() =>
					update((d) => ({
						...d,
						experiences: [
							...(d.experiences ?? []),
							{
								id: crypto.randomUUID(),
								organization: "",
								role: "",
								startDate: "",
								endDate: null,
								current: false,
								description: "",
							},
						],
					}))
				}
			>
				{t.add} {t.experiences}
			</button>
		</section>
	);
}
