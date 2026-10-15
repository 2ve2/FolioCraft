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
	const restored: Draft = {
		...draft,
		appearance: {
			...draft.appearance,
			profileVisualVisible: draft.appearance.profileVisualVisible ?? true,
			projectFallbackVisible: draft.appearance.projectFallbackVisible ?? true,
		},
		profile: {
			...draft.profile,
			socialLinks: draft.profile.socialLinks ?? [],
			imageAssetId: draft.profile.imageAssetId ?? null,
		},
		projects: draft.projects.map((project) => ({
			...project,
			slug: project.slug ?? project.id,
			coverAssetId: project.coverAssetId ?? null,
			galleryAssetIds: project.galleryAssetIds ?? [],
			richBody: project.richBody ?? [],
			results: project.results ?? "",
			featured: project.featured ?? false,
		})),
		sectionVisibility: {
			projects: draft.sectionVisibility?.projects ?? draft.appearance.projectsVisible,
			experiences: draft.sectionVisibility?.experiences ?? true,
			education: draft.sectionVisibility?.education ?? true,
			skills: draft.sectionVisibility?.skills ?? true,
			articles: draft.sectionVisibility?.articles ?? true,
			contact: draft.sectionVisibility?.contact ?? true,
		},
		experiences: draft.experiences ?? [],
		education: draft.education ?? [],
		skills: draft.skills ?? [],
		articles: (draft.articles ?? []).map((article) => ({
			...article,
			coverAssetId: article.coverAssetId ?? null,
			richBody: article.richBody ?? [],
		})),
	};
	const validated = draftSchema.safeParse(restored);
	if (!validated.success) throw new DraftImportError("invalid");
	return validated.data;
}
