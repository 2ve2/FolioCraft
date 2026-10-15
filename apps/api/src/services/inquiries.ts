import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { inquiries } from "../db/schema/operations";
import { sites } from "../db/schema/site";
import { ApiError } from "../lib/response-helpers";
import { siteDraftService } from "./sites/draft-service";
import { activeOwnerPredicate } from "./sites/public-access";
import { publicSiteService } from "./sites/public-service";

export const inquiryService = {
	/** Persists an inquiry only while the published site and owner remain accessible. */
	async create(slug: string, data: { name: string; email: string; message: string }) {
		// Resolve only an actively published portfolio; drafts cannot receive public inquiries.
		await publicSiteService.public(slug);
		const result = await db.transaction(async (tx) => {
			const [site] = await tx.select().from(sites).where(eq(sites.slug, slug)).for("update");
			if (!site?.publishedReleaseId || site.suspended) throw new ApiError(404, "NOT_FOUND");
			// Hold the owner row against concurrent ban updates until intake commits.
			const [owner] = await tx
				.select()
				.from(user)
				.where(and(eq(user.id, site.ownerId), activeOwnerPredicate()))
				.for("share");
			if (!owner) throw new ApiError(404, "NOT_FOUND");
			const [entry] = await tx
				.insert(inquiries)
				.values({ siteId: site.id, ...data })
				.returning({ id: inquiries.id, createdAt: inquiries.createdAt });
			return { id: entry.id, createdAt: entry.createdAt.toISOString() };
		});
		return result;
	},

	/** Lists a bounded inquiry inbox after checking site ownership. */
	async list(
		userId: string,
		siteId: string,
		limit: number,
		offset: number,
		status?: "new" | "read" | "archived",
	) {
		await siteDraftService.preview(userId, siteId);
		const rows = await db
			.select()
			.from(inquiries)
			.where(and(eq(inquiries.siteId, siteId), status ? eq(inquiries.status, status) : undefined))
			.orderBy(sql`${inquiries.createdAt} desc`, sql`${inquiries.id} desc`)
			.limit(limit + 1)
			.offset(offset);
		return { items: rows.slice(0, limit), hasMore: rows.length > limit, limit, offset };
	},

	/** Changes the status of an inquiry belonging to an owned site. */
	async update(userId: string, siteId: string, id: string, status: "read" | "archived") {
		await siteDraftService.preview(userId, siteId);
		const [entry] = await db
			.update(inquiries)
			.set({ status, updatedAt: new Date() })
			.where(and(eq(inquiries.siteId, siteId), eq(inquiries.id, id)))
			.returning();
		if (!entry) throw new ApiError(404, "NOT_FOUND");
		return entry;
	},
};
