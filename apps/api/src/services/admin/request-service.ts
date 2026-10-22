import { type DataRequest, dataRequestTransitions } from "@ichnara/contracts";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { env } from "../../config/env";
import { db } from "../../db";
import { afterText, binaryText } from "../../db/keyset";
import { user } from "../../db/schema/auth";
import { dataRequests as requests } from "../../db/schema/data-requests";
import { inquiries } from "../../db/schema/operations";
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

/** Operational placeholder only; the configured period needs legal confirmation before live use. */
export const DATA_REQUEST_DUE_DAYS = env.DATA_REQUEST_DUE_DAYS;
const view = (row: typeof requests.$inferSelect) => ({
	...row,
	// Contact is never a subject lookup, nor searchable. Default reads preserve masking.
	email: `${row.email[0]}***${row.email.slice(row.email.lastIndexOf("@"))}`,
});
export const requestService = {
	async list(q: {
		limit: number;
		cursor?: string;
		status?: DataRequest["status"];
		type?: DataRequest["type"];
		overdue?: boolean;
	}) {
		const rows = await db
			.select()
			.from(requests)
			.where(
				and(
					q.cursor ? afterText(requests.id, q.cursor) : undefined,
					q.status ? eq(requests.status, q.status) : undefined,
					q.type ? eq(requests.type, q.type) : undefined,
					q.overdue
						? and(
								lte(requests.dueAt, sql`current_timestamp`),
								sql`${requests.status} in ('received','in_progress')`,
							)
						: undefined,
				),
			)
			.orderBy(binaryText(requests.id))
			.limit(q.limit + 1);
		const items = rows.slice(0, q.limit).map(view);
		return {
			items,
			nextCursor: rows.length > q.limit ? items.at(-1)?.id : null,
			dueDays: DATA_REQUEST_DUE_DAYS,
		};
	},
	async get(id: string) {
		const [row] = await db.select().from(requests).where(eq(requests.id, id));
		if (!row) throw new ApiError(404, "NOT_FOUND");
		return view(row);
	},
	/** Every write uses the same password/TOTP/durable attempt boundary, then transactional outcome. */
	async change(
		headers: Headers,
		id: string,
		credentials: unknown,
		operation:
			| { kind: "create"; email: string; type: DataRequest["type"] }
			| { kind: "subject"; userId: string; confirmation: string; evidence: string }
			| { kind: "status"; status: DataRequest["status"]; notes?: string },
	) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const { audit } = await prepareSensitiveAction(
			actor,
			headers,
			"request.handle",
			id,
			credentials,
		);
		try {
			return await db.transaction(async (tx) => {
				let row: typeof requests.$inferSelect | undefined;
				if (operation.kind === "create") {
					[row] = await tx
						.insert(requests)
						.values({
							id,
							email: operation.email,
							type: operation.type,
							dueAt: new Date(Date.now() + DATA_REQUEST_DUE_DAYS * 86400000),
							handledBy: actor.user.id,
						})
						.returning();
				} else {
					const [current] = await tx
						.select()
						.from(requests)
						.where(eq(requests.id, id))
						.for("update");
					if (!current) throw new ApiError(404, "NOT_FOUND");
					if (operation.kind === "subject") {
						if (current.status !== "in_progress" || current.userId || current.subjectVerifiedAt)
							throw new ApiError(409, "REQUEST_STATUS_CONFLICT");
						if (operation.userId !== operation.confirmation)
							throw new ApiError(400, "CONFIRMATION_MISMATCH");
						await requireOrdinaryTarget(operation.userId, tx);
						// An exact ID plus recorded independent verification evidence is an operator attestation.
						// Contact email equality is deliberately neither sufficient nor required.
						[row] = await tx
							.update(requests)
							.set({
								userId: operation.userId,
								subjectVerifiedAt: new Date(),
								subjectVerifiedBy: actor.user.id,
								notes: operation.evidence,
								handledBy: actor.user.id,
							})
							.where(eq(requests.id, id))
							.returning();
					} else {
						const allowed: readonly string[] = dataRequestTransitions[current.status];
						if (!allowed.includes(operation.status))
							throw new ApiError(409, "REQUEST_STATUS_CONFLICT");
						if (operation.status === "completed" && !current.subjectVerifiedAt)
							throw new ApiError(409, "REQUEST_SUBJECT_REQUIRED");
						if (operation.status === "completed" && current.type === "export") {
							const proof = await tx.execute(
								sql`select 1 from admin_audit where action='request.export' and target_id=${id} and status='succeeded' and created_at >= ${current.subjectVerifiedAt} limit 1`,
							);
							if (!proof.rows.length) throw new ApiError(409, "REQUEST_EXPORT_REQUIRED");
						}
						const closed = operation.status === "completed" || operation.status === "rejected";
						[row] = await tx
							.update(requests)
							.set({
								status: operation.status,
								notes: operation.notes ?? current.notes,
								handledBy: actor.user.id,
								completedAt: closed ? new Date() : null,
							})
							.where(eq(requests.id, id))
							.returning();
					}
				}
				try {
					await recordAdminAction(
						tx,
						{
							actorId: audit.actorId,
							requestId: audit.requestId,
							reason: audit.reason,
							status: "succeeded",
						},
						"request.handle",
						"request",
						id,
						{ operation: operation.kind },
					);
				} catch {
					throw new ApiError(503, "ADMIN_AUDIT_UNAVAILABLE");
				}
				if (!row) throw new ApiError(503, "ADMIN_ACTION_FAILED");
				return view(row);
			});
		} catch (e) {
			await appendSensitiveOutcome(audit, "failed");
			// The failed outcome is already audited; do not add a second denial row.
			if (e && typeof e === "object") markSensitiveDenial(e);
			throw e;
		}
	},
	/** Explicit safe columns only; resolve stored verified subject, never infer one from contact text. */
	async export(headers: Headers, id: string, credentials: unknown) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const { audit } = await prepareSensitiveAction(
			actor,
			headers,
			"request.export",
			id,
			credentials,
		);
		let json: string;
		try {
			json = await db.transaction(async (tx) => {
				const [request] = await tx.select().from(requests).where(eq(requests.id, id)).for("update");
				if (!request) throw new ApiError(404, "NOT_FOUND");
				if (
					request.type !== "export" ||
					request.status !== "in_progress" ||
					!request.userId ||
					!request.subjectVerifiedAt
				)
					throw new ApiError(409, "REQUEST_SUBJECT_REQUIRED");
				await requireOrdinaryTarget(request.userId, tx);
				const [subject] = await tx
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						emailVerified: user.emailVerified,
						createdAt: user.createdAt,
						updatedAt: user.updatedAt,
					})
					.from(user)
					.where(eq(user.id, request.userId))
					.for("share");
				if (!subject) throw new ApiError(409, "REQUEST_SUBJECT_REQUIRED");
				// The subject's own content: each site's current draft and its active published release.
				const owned = await tx
					.select({
						id: sites.id,
						ownerId: sites.ownerId,
						slug: sites.slug,
						publishedReleaseId: sites.publishedReleaseId,
						createdAt: sites.createdAt,
						updatedAt: sites.updatedAt,
						draft: sites.draft,
						publishedRelease: {
							id: releases.id,
							revision: releases.revision,
							createdAt: releases.createdAt,
							snapshot: releases.snapshot,
						},
					})
					.from(sites)
					.leftJoin(
						releases,
						and(eq(releases.id, sites.publishedReleaseId), eq(releases.siteId, sites.id)),
					)
					.where(eq(sites.ownerId, subject.id))
					.orderBy(asc(sites.id))
					.limit(env.DATA_REQUEST_EXPORT_MAX_ROWS + 1);
				const messages = await tx
					.select({
						id: inquiries.id,
						siteId: inquiries.siteId,
						name: inquiries.name,
						email: inquiries.email,
						message: inquiries.message,
						status: inquiries.status,
						createdAt: inquiries.createdAt,
						updatedAt: inquiries.updatedAt,
					})
					.from(inquiries)
					.innerJoin(sites, eq(inquiries.siteId, sites.id))
					.where(eq(sites.ownerId, subject.id))
					.orderBy(asc(inquiries.id))
					.limit(env.DATA_REQUEST_EXPORT_MAX_ROWS + 1);
				if (1 + owned.length + messages.length > env.DATA_REQUEST_EXPORT_MAX_ROWS)
					throw new ApiError(413, "REQUEST_EXPORT_TOO_LARGE");
				const output = JSON.stringify({
					schemaVersion: 2,
					requestId: id,
					generatedAt: new Date().toISOString(),
					account: subject,
					sites: owned.map((site) => ({
						...site,
						publishedRelease: site.publishedRelease?.id ? site.publishedRelease : null,
					})),
					inquiries: messages,
					exclusions: [
						"credentials",
						"sessions",
						"tokens",
						"MFA",
						"inactive historical release snapshots",
						"audit",
						"reports",
						"uploaded image files (R2 objects and keys)",
						"backups",
					],
				});
				if (new TextEncoder().encode(output).byteLength > env.DATA_REQUEST_EXPORT_MAX_BYTES)
					throw new ApiError(413, "REQUEST_EXPORT_TOO_LARGE");
				return output;
			});
		} catch (e) {
			await appendSensitiveOutcome(audit, "failed");
			// The failed outcome is already audited; do not add a second denial row.
			if (e && typeof e === "object") markSensitiveDenial(e);
			throw e;
		}
		// Withhold bytes until a durable success outcome exists.
		await appendSensitiveOutcome(audit, "succeeded");
		return json;
	},
};
