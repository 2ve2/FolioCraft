import { type Draft, draftSchema } from "@folio/contracts";

export class DraftImportError extends Error {
	constructor(readonly reason: "size" | "invalid") {
		super(reason);
	}
}

/** Reads exported JSON locally and validates it before any server mutation. */
export async function readDraftBackup(file: Pick<File, "name" | "size" | "text">): Promise<Draft> {
	if (file.size > 2 * 1024 * 1024) throw new DraftImportError("size");
	if (!file.name.toLowerCase().endsWith(".json")) throw new DraftImportError("invalid");
	let value: unknown;
	try {
		value = JSON.parse(await file.text());
	} catch {
		throw new DraftImportError("invalid");
	}
	const parsed = draftSchema.safeParse(value);
	if (!parsed.success) throw new DraftImportError("invalid");
	const draft = parsed.data;
	// Older exports omit optional collections; restoring them must clear those sections.
	return {
		...draft,
		profile: { ...draft.profile, socialLinks: draft.profile.socialLinks ?? [] },
		experiences: draft.experiences ?? [],
		education: draft.education ?? [],
		skills: draft.skills ?? [],
		articles: draft.articles ?? [],
	};
}
