import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { assets } from "../db/schema/asset";
import { user } from "../db/schema/auth";
import { inquiries } from "../db/schema/operations";
import { releases, sites } from "../db/schema/site";
import { ApiError } from "../lib/response-helpers";
import { type AuditContext, recordAdminAction } from "./auditService";

// Select only administrative metadata; drafts and private contact messages remain excluded.
const siteOverview = {
	id: sites.id,
	ownerId: sites.ownerId,
	slug: sites.slug,
	revision: sites.revision,
	publishedReleaseId: sites.publishedReleaseId,
	suspended: sites.suspended,
	suspensionReason: sites.suspensionReason,
	createdAt: sites.createdAt,
	updatedAt: sites.updatedAt,
};

export const adminService = {
	/** Lists a bounded page of site metadata without loading any draft or release content. */
	async listSites(limit: number, offset: number, suspended?: boolean, published?: boolean) {
		const rows = await db
			.select(siteOverview)
			.from(sites)
			.where(
				and(
					suspended === undefined ? undefined : eq(sites.suspended, suspended),
					published === undefined
						? undefined
						: published
							? isNotNull(sites.publishedReleaseId)
							: isNull(sites.publishedReleaseId),
				),
			)
			.orderBy(desc(sites.createdAt), desc(sites.id))
			.limit(limit + 1)
			.offset(offset);
		return { items: rows.slice(0, limit), hasMore: rows.length > limit, limit, offset };
	},

	/** Returns metadata and resource counts for one site without exposing private resource bodies. */
	async site(id: string) {
		// Bind the selected site ID: unqualified inner id columns refer to the resource row.
		const [site] = await db
			.select({
				...siteOverview,
				releaseCount: sql<number>`(select count(*)::int from ${releases} where ${releases.siteId} = ${id})`,
				assetCount: sql<number>`(select count(*)::int from ${assets} where ${assets.siteId} = ${id})`,
				inquiryCount: sql<number>`(select count(*)::int from ${inquiries} where ${inquiries.siteId} = ${id})`,
			})
			.from(sites)
			.where(eq(sites.id, id))
			.limit(1);
		if (!site) throw new ApiError(404, "NOT_FOUND");
		return site;
	},

	/** Reports operational aggregate counts from one database statement without personal content. */
	async resources() {
		const result = await db.execute<{
			users: number;
			sites: number;
			suspendedSites: number;
			publishedSites: number;
			releases: number;
			assets: number;
			inquiries: number;
		}>(sql`select
			(select count(*)::int from ${user}) as "users",
			(select count(*)::int from ${sites}) as "sites",
			(select count(*)::int from ${sites} where ${sites.suspended}) as "suspendedSites",
			(select count(*)::int from ${sites} where ${sites.publishedReleaseId} is not null) as "publishedSites",
			(select count(*)::int from ${releases}) as "releases",
			(select count(*)::int from ${assets}) as "assets",
			(select count(*)::int from ${inquiries}) as "inquiries"`);
		return result.rows[0];
	},

	/** Locks the site and commits its moderation change together with a required reason audit. */
	async moderate(id: string, suspended: boolean, context: AuditContext & { reason: string }) {
		return db.transaction(async (tx) => {
			const [site] = await tx
				.select(siteOverview)
				.from(sites)
				.where(eq(sites.id, id))
				.for("update");
			if (!site) throw new ApiError(404, "NOT_FOUND");
			if (site.suspended === suspended) throw new ApiError(409, "MODERATION_CONFLICT");
			const [updated] = await tx
				.update(sites)
				.set({
					suspended,
					suspensionReason: suspended ? context.reason : null,
					updatedAt: new Date(),
				})
				.where(eq(sites.id, id))
				.returning(siteOverview);
			await recordAdminAction(
				tx,
				{ ...context, status: "succeeded" },
				suspended ? "site.suspend" : "site.resume",
				"site",
				id,
				{ previousSuspended: site.suspended, suspended },
			);
			return updated;
		});
	},
};
