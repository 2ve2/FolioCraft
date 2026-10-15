import type { Draft } from "@folio/contracts";
import { ApiError } from "../../lib/response-helpers";
import { mutateOwnedDraft, siteDraftService } from "./draft-service";

export type ContentCollection = "projects" | "experiences" | "education" | "skills" | "articles";
type CollectionItem = NonNullable<Draft[ContentCollection]>[number];
type ProfilePatch = Partial<Draft["profile"]>;
type AppearancePatch = Partial<Draft["appearance"]>;
type SectionsPatch = NonNullable<Draft["sectionVisibility"]>;

export const contentService = {
	/** Reads an owned draft collection together with its optimistic revision. */
	async read(userId: string, siteId: string, collection: ContentCollection) {
		const site = await siteDraftService.preview(userId, siteId);
		return { revision: site.revision, items: site.draft[collection] ?? [] };
	},

	/** Reads one item from an owned collection without exposing another site’s content. */
	async readItem(userId: string, siteId: string, collection: ContentCollection, itemId: string) {
		const result = await this.read(userId, siteId, collection);
		const item = result.items.find((value) => value.id === itemId);
		if (!item) throw new ApiError(404, "NOT_FOUND");
		return { revision: result.revision, item };
	},

	/** Appends a uniquely identified item through the owned draft revision guard. */
	async create(
		userId: string,
		siteId: string,
		revision: number,
		collection: ContentCollection,
		item: CollectionItem,
	) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => {
			const items = draft[collection] ?? [];
			if (items.some((value) => value.id === item.id)) throw new ApiError(409, "ITEM_EXISTS");
			return { ...draft, [collection]: [...items, item] };
		});
	},

	/** Applies item fields while preserving its identity and checking the draft revision. */
	async update(
		userId: string,
		siteId: string,
		revision: number,
		collection: ContentCollection,
		itemId: string,
		patch: Record<string, unknown>,
	) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => {
			const items = draft[collection] ?? [];
			if (!items.some((value) => value.id === itemId)) throw new ApiError(404, "NOT_FOUND");
			return {
				...draft,
				[collection]: items.map((value) =>
					value.id === itemId ? { ...value, ...patch, id: itemId } : value,
				),
			};
		});
	},

	/** Removes an existing item through the owned draft revision guard. */
	async remove(
		userId: string,
		siteId: string,
		revision: number,
		collection: ContentCollection,
		itemId: string,
	) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => {
			const items = draft[collection] ?? [];
			if (!items.some((value) => value.id === itemId)) throw new ApiError(404, "NOT_FOUND");
			return { ...draft, [collection]: items.filter((value) => value.id !== itemId) };
		});
	},

	/** Accepts only an exact permutation of the collection’s existing item identifiers. */
	async reorder(
		userId: string,
		siteId: string,
		revision: number,
		collection: ContentCollection,
		ids: string[],
	) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => {
			const items = draft[collection] ?? [];
			const indexed = new Map(items.map((value) => [value.id, value]));
			if (
				ids.length !== items.length ||
				new Set(ids).size !== ids.length ||
				ids.some((value) => !indexed.has(value))
			)
				throw new ApiError(400, "INVALID_ORDER");
			return { ...draft, [collection]: ids.map((id) => indexed.get(id)) };
		});
	},

	/** Merges validated profile changes into an owned draft. */
	async profile(userId: string, siteId: string, revision: number, patch: ProfilePatch) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => ({
			...draft,
			profile: { ...draft.profile, ...patch },
		}));
	},

	/** Updates appearance while keeping legacy project visibility synchronized. */
	async appearance(userId: string, siteId: string, revision: number, patch: AppearancePatch) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => ({
			...draft,
			appearance: { ...draft.appearance, ...patch },
			...(draft.sectionVisibility && patch.projectsVisible !== undefined
				? { sectionVisibility: { ...draft.sectionVisibility, projects: patch.projectsVisible } }
				: {}),
		}));
	},

	/** Updates section visibility and synchronizes the legacy appearance flag. */
	async sections(userId: string, siteId: string, revision: number, patch: SectionsPatch) {
		return mutateOwnedDraft(userId, siteId, revision, (draft) => ({
			...draft,
			sectionVisibility: { ...draft.sectionVisibility, ...patch },
			appearance: {
				...draft.appearance,
				...(patch.projects !== undefined ? { projectsVisible: patch.projects } : {}),
			},
		}));
	},
};
