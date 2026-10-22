import { publishedDraft } from "@ichnara/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema/auth";
import { releases, sites } from "../../db/schema/site";
import { ApiError } from "../../lib/response-helpers";
import { publicAccessPredicate } from "./public-access";

/** Reads only the active release and stable identity of an accessible portfolio. */
async function publishedSite(slug: string) {
	const [site] = await db
		.select({
			siteId: sites.id,
			slug: sites.slug,
			releaseId: releases.id,
			publishedAt: releases.createdAt,
			draft: releases.snapshot,
		})
		.from(sites)
		.innerJoin(
			releases,
			and(eq(sites.publishedReleaseId, releases.id), eq(sites.id, releases.siteId)),
		)
		.innerJoin(user, eq(user.id, sites.ownerId))
		.where(and(eq(sites.slug, slug), publicAccessPredicate()))
		.limit(1);
	if (!site) throw new ApiError(404, "NOT_FOUND");
	return {
		...site,
		draft: publishedDraft(site.draft),
		publishedAt: site.publishedAt.toISOString(),
	};
}

export const publicSiteService = {
	/** Preserves the existing public DTO for the uncached route. */
	async public(slug: string) {
		const { siteId: _siteId, ...site } = await publishedSite(slug);
		return site;
	},
	/** Supplies stable tags alongside the same published projection, never an owner draft. */
	cacheable: publishedSite,
};
