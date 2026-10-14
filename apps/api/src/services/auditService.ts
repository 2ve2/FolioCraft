import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { adminAudit } from "../db/schema/admin";
import type { DraftTransaction } from "./siteDraftService";
export type AuditContext = {
	actorId: string;
	requestId: string;
	reason?: string;
	status?: "attempted" | "succeeded" | "failed";
};

export type AuditFilters = {
	targetType?: "site" | "user" | "session";
	targetId?: string;
	status?: "attempted" | "succeeded" | "failed";
};

/** Appends a platform moderation event within the same transaction as the protected change. */
export async function recordAdminAction(
	tx: DraftTransaction,
	context: AuditContext,
	action: string,
	targetType: string,
	targetId: string,
	metadata: Record<string, string | boolean | number | null> = {},
) {
	await tx.insert(adminAudit).values({ ...context, action, targetType, targetId, metadata });
}

/** Lists immutable audit events using bounded pagination and optional actor/action filters. */
export async function listAdminAudit(
	limit: number,
	offset: number,
	actorId?: string,
	action?: string,
	filters: AuditFilters = {},
) {
	const rows = await db
		.select()
		.from(adminAudit)
		.where(
			and(
				actorId ? eq(adminAudit.actorId, actorId) : undefined,
				action ? eq(adminAudit.action, action) : undefined,
				filters.targetType ? eq(adminAudit.targetType, filters.targetType) : undefined,
				filters.targetId ? eq(adminAudit.targetId, filters.targetId) : undefined,
				filters.status ? eq(adminAudit.status, filters.status) : undefined,
			),
		)
		.orderBy(desc(adminAudit.createdAt), desc(adminAudit.id))
		.limit(limit + 1)
		.offset(offset);
	return {
		items: rows.slice(0, limit).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
		hasMore: rows.length > limit,
		limit,
		offset,
	};
}
