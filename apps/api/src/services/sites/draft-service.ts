import { type Draft, draftSchema, emptyDraft, type Locale } from "@ichnara/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { sites } from "../../db/schema/site";
import { ApiError } from "../../lib/response-helpers";
import { validateAssets } from "../assets";
import { affectPublicSite } from "../cache-invalidation";

export type DraftTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Builds an ownership predicate for site reads and mutations. */
export const ownedSite = (id: string, userId: string) =>
	and(eq(sites.id, id), eq(sites.ownerId, userId));

/** Projects owned site fields required by the editor. */
export const siteDto = (site: typeof sites.$inferSelect) => ({
	id: site.id,
	slug: site.slug,
	revision: site.revision,
	draft: site.draft,
	publishedReleaseId: site.publishedReleaseId,
});

/** Locks the owned site until the enclosing transaction finishes. */
export async function lockOwnedSite(tx: DraftTransaction, userId: string, id: string) {
	const [site] = await tx.select().from(sites).where(ownedSite(id, userId)).for("update");
	if (!site) throw new ApiError(404, "NOT_FOUND");
	return site;
}

/** Validates and saves a draft mutation with ownership, revision and asset guards. */
export async function mutateOwnedDraft(
	userId: string,
	id: string,
	revision: number,
	change: (draft: Draft) => Draft,
) {
	return db.transaction(async (tx) => {
		const site = await lockOwnedSite(tx, userId, id);
		if (site.revision !== revision) throw new ApiError(409, "REVISION_CONFLICT");
		const next = draftSchema.parse(change(site.draft));
		await validateAssets(tx, id, userId, next);
		const [updated] = await tx
			.update(sites)
			.set({ draft: next, revision: site.revision + 1, updatedAt: new Date() })
			.where(ownedSite(id, userId))
			.returning();
		return siteDto(updated);
	});
}

/** Preserves newer optional fields when an older editor submits a legacy draft. */
function mergeLegacyDraft(previous: Draft, incoming: Draft): Draft {
	const next: Draft = {
		...previous,
		...incoming,
		profile: { ...previous.profile, ...incoming.profile },
		appearance: { ...previous.appearance, ...incoming.appearance },
		projects: incoming.projects.map((item) => ({
			...previous.projects.find((old) => old.id === item.id),
			...item,
		})),
	};
	if (previous.sectionVisibility || incoming.sectionVisibility) {
		next.sectionVisibility = { ...previous.sectionVisibility, ...incoming.sectionVisibility };
		if (incoming.sectionVisibility?.projects !== undefined) {
			next.appearance.projectsVisible = incoming.sectionVisibility.projects;
		} else if (incoming.appearance.projectsVisible !== previous.appearance.projectsVisible) {
			next.sectionVisibility.projects = incoming.appearance.projectsVisible;
		}
	}
	return next;
}

export const siteDraftService = {
	/** Finds the site owned by the authenticated account. */
	async list(userId: string) {
		const [site] = await db.select().from(sites).where(eq(sites.ownerId, userId)).limit(1);
		return site ? siteDto(site) : null;
	},

	/** Creates an owned portfolio with a validated initial draft. */
	async create(userId: string, slug: string, locale: Locale) {
		const [site] = await db
			.insert(sites)
			.values({ ownerId: userId, slug, draft: emptyDraft(locale) })
			.returning();
		return siteDto(site);
	},

	/** Reads an owned draft without exposing it publicly. */
	async preview(userId: string, id: string) {
		const [site] = await db.select().from(sites).where(ownedSite(id, userId)).limit(1);
		if (!site) throw new ApiError(404, "NOT_FOUND");
		return siteDto(site);
	},

	/** Saves compatible draft content through the revision guard. */
	async save(userId: string, id: string, revision: number, draft: Draft) {
		return mutateOwnedDraft(userId, id, revision, (current) => mergeLegacyDraft(current, draft));
	},

	/** Updates owned site settings under a row lock and revision guard. */
	async update(
		userId: string,
		id: string,
		revision: number,
		patch: { slug?: string; locale?: Locale },
	) {
		return db.transaction(async (tx) => {
			const site = await lockOwnedSite(tx, userId, id);
			if (patch.slug && patch.slug !== site.slug) affectPublicSite(site.id);
			if (site.revision !== revision) throw new ApiError(409, "REVISION_CONFLICT");
			const [updated] = await tx
				.update(sites)
				.set({
					slug: patch.slug ?? site.slug,
					draft: patch.locale ? { ...site.draft, locale: patch.locale } : site.draft,
					revision: site.revision + 1,
					updatedAt: new Date(),
				})
				.where(ownedSite(id, userId))
				.returning();
			return siteDto(updated);
		});
	},
};
