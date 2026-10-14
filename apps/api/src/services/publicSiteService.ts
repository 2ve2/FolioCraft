import { publishedDraft } from "@folio/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { releases, sites } from "../db/schema/site";
import { ApiError } from "../lib/response-helpers";
import { publicAccessPredicate } from "./publicAccess";
export const publicSiteService = {
	/** Reads only the active release of an accessible portfolio. */
	async public(slug: string) {
		const [site] = await db
			.select({
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
	},
};
