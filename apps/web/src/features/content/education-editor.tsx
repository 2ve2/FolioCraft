"use client";
import type { Education } from "@ichnara/contracts";
import { SelectControl } from "../../components/ui/select-control";
import { CollectionActions } from "./collection-actions";
import { labels } from "./copy";
import { Input } from "./input";
import type { ContentEditorProps } from "./types";

/** Edits education and certificate entries through the shared draft updater. */
export function EducationEditor({ draft, locale, update }: Omit<ContentEditorProps, "siteId">) {
	const t = labels[locale];

	/** Changes one education entry while preserving all other draft data. */
	const patchEducation = (id: string, patch: Partial<Education>) =>
		update((d) => ({
			...d,
			education: (d.education ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
		}));

	return (
		<section className="editor-card" id="studio-education">
			<h2>{t.education}</h2>
			{(draft.education ?? []).map((x, i) => (
				<div className="collection-item" key={x.id}>
					<CollectionActions
						draft={draft}
						locale={locale}
						update={update}
						collection="education"
						index={i}
					/>
					<Input
						label={t.organization}
						max={160}
						value={x.organization}
						onChange={(organization) => patchEducation(x.id, { organization })}
					/>
					<Input
						label={t.qualification}
						max={180}
						value={x.qualification}
						onChange={(qualification) => patchEducation(x.id, { qualification })}
					/>
					<div className="field">
						<span>{t.type}</span>
						<SelectControl
							label={t.type}
							value={x.type ?? "education"}
							options={[
								{ value: "education", label: t.education },
								{ value: "certificate", label: t.certificate },
							]}
							onChange={(type) => patchEducation(x.id, { type: type as Education["type"] })}
						/>
					</div>
					<div className="two-fields">
						<Input
							label={t.start}
							type="date"
							locale={locale}
							value={x.startDate}
							onChange={(startDate) => patchEducation(x.id, { startDate })}
						/>
						<Input
							label={t.end}
							type="date"
							locale={locale}
							value={x.endDate ?? ""}
							onChange={(endDate) => patchEducation(x.id, { endDate: endDate || null })}
						/>
					</div>
					<Input
						label={t.description}
						multiline
						max={3000}
						value={x.description}
						onChange={(description) => patchEducation(x.id, { description })}
					/>
					<Input
						label={t.verification}
						type="url"
						max={2000}
						value={x.verificationUrl}
						onChange={(verificationUrl) => patchEducation(x.id, { verificationUrl })}
					/>
				</div>
			))}
			<button
				className="secondary"
				type="button"
				disabled={(draft.education?.length ?? 0) >= 50}
				onClick={() =>
					update((d) => ({
						...d,
						education: [
							...(d.education ?? []),
							{
								id: crypto.randomUUID(),
								organization: "",
								qualification: "",
								startDate: "",
								endDate: null,
								description: "",
								verificationUrl: "",
								type: "education",
							},
						],
					}))
				}
			>
				{t.add} {t.education}
			</button>
		</section>
	);
}
