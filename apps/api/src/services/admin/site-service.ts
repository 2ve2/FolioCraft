import { and, asc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { assets } from "../../db/schema/asset";
import { user } from "../../db/schema/auth";
import { inquiries } from "../../db/schema/operations";
import { contentReports } from "../../db/schema/reports";
import { releases, sites } from "../../db/schema/site";
import { auth } from "../../lib/auth";
import { ApiError } from "../../lib/response-helpers";
import { recordAdminAction } from "./audit-service";
import {
	appendSensitiveOutcome,
	markSensitiveDenial,
	prepareSensitiveAction,
	requireOrdinaryTarget,
} from "./sensitive-action";

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
	async listSites(query: {
		limit: number;
		offset?: number;
		cursor?: string;
		ownerId?: string;
		suspended?: boolean;
		published?: boolean;
		reported?: boolean;
	}) {
		const rows = await db
			.select(siteOverview)
			.from(sites)
			.where(
				and(
					query.cursor ? gt(sites.id, query.cursor) : undefined,
					query.ownerId ? eq(sites.ownerId, query.ownerId) : undefined,
					query.suspended === undefined ? undefined : eq(sites.suspended, query.suspended),
					query.published === undefined
						? undefined
						: query.published
							? isNotNull(sites.publishedReleaseId)
							: isNull(sites.publishedReleaseId),
					query.reported === undefined
						? undefined
						: sql`exists(select 1 from ${contentReports} where ${contentReports.siteId} = ${sites.id}) = ${query.reported}`,
				),
			)
			.orderBy(asc(sites.id))
			.limit(query.limit + 1)
			.offset(query.offset ?? 0);
		const items = rows.slice(0, query.limit);
		return {
			items,
			hasMore: rows.length > query.limit,
			nextCursor: rows.length > query.limit ? items.at(-1)?.id : null,
			limit: query.limit,
			offset: query.offset ?? 0,
		};
	},

	/** Returns metadata and resource counts for one site without exposing private resource bodies. */
	async site(id: string) {
		// Bind the selected site ID: unqualified inner id columns refer to the resource row.
		const [site] = await db
			.select({
				...siteOverview,
				locale: sql<
					string | null
				>`(select ${releases.snapshot}->>'locale' from ${releases} where ${releases.id} = ${sites.publishedReleaseId} and ${releases.siteId} = ${sql.raw('"sites"."id"')})`,
				publishedAt: sql<
					string | null
				>`(select ${releases.createdAt} from ${releases} where ${releases.id} = ${sites.publishedReleaseId} and ${releases.siteId} = ${sql.raw('"sites"."id"')})`,
				readyImages: sql<number>`(select count(*)::int from ${assets} where ${assets.siteId} = ${id} and ${assets.status} = 'ready')`,
				pendingImages: sql<number>`(select count(*)::int from ${assets} where ${assets.siteId} = ${id} and ${assets.status} = 'pending')`,
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
	async moderate(id: string, suspended: boolean, headers: Headers, input: unknown) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const { audit } = await prepareSensitiveAction(
			actor,
			headers,
			suspended ? "site.suspend" : "site.resume",
			id,
			input,
		);
		try {
			return await db.transaction(async (tx) => {
				const [site] = await tx
					.select(siteOverview)
					.from(sites)
					.where(eq(sites.id, id))
					.for("update");
				if (!site) throw new ApiError(404, "NOT_FOUND");
				await requireOrdinaryTarget(site.ownerId, tx);
				if (site.suspended === suspended) throw new ApiError(409, "MODERATION_CONFLICT");
				const [updated] = await tx
					.update(sites)
					.set({
						suspended,
						suspensionReason: suspended ? audit.reason : null,
						updatedAt: new Date(),
					})
					.where(eq(sites.id, id))
					.returning(siteOverview);
				await recordAdminAction(
					tx,
					{
						actorId: audit.actorId,
						requestId: audit.requestId,
						reason: audit.reason,
						status: "succeeded",
					},
					suspended ? "site.suspend" : "site.resume",
					"site",
					id,
					{ previousSuspended: site.suspended, suspended },
				);
				return updated;
			});
		} catch (error) {
			await appendSensitiveOutcome(audit, "failed");
			if (error && typeof error === "object") markSensitiveDenial(error);
			throw error;
		}
	},
};
