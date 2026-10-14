import { slugSchema } from "@folio/contracts";
import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { releases, sites } from "../db/schema/site";
import { successResponse } from "../lib/response-helpers";
import { publicAccessPredicate } from "../services/publicAccess";

export const publicSitemapRoutes = new Hono();
/** Discovers only current accessible published URLs, without drafts or account fields. */
publicSitemapRoutes.get("/sitemap", async (c) => {
	const { after } = z.object({ after: slugSchema.optional() }).strict().parse(c.req.query());
	const rows = await db
		.select({ slug: sites.slug, publishedAt: releases.createdAt })
		.from(sites)
		.innerJoin(
			releases,
			and(eq(sites.publishedReleaseId, releases.id), eq(sites.id, releases.siteId)),
		)
		.innerJoin(user, eq(user.id, sites.ownerId))
		.where(and(publicAccessPredicate(), after ? gt(sites.slug, after) : undefined))
		.orderBy(asc(sites.slug))
		.limit(101);
	const page = rows.slice(0, 100);
	return successResponse(c, {
		sites: page.map((site) => ({ ...site, publishedAt: site.publishedAt.toISOString() })),
		nextCursor: rows.length > 100 ? page.at(-1)?.slug : null,
	});
});
