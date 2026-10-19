import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { adminAudit } from "../../db/schema/admin";
import type { DraftTransaction } from "../sites/draft-service";

export type AuditContext = {
	actorId: string;
	requestId: string;
	reason?: string;
	status?: "attempted" | "succeeded" | "failed";
};

export type AuditFilters = {
	requestId?: string;
	from?: string;
	to?: string;
	targetType?: "site" | "user" | "session" | "report" | "notice" | "audit" | "request";
	targetId?: string;
	status?: "attempted" | "succeeded" | "failed";
};

/** Appends a platform moderation event within the same transaction as the protected change. */
export async function recordAdminAction(
	tx: DraftTransaction | typeof db,
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
				filters.requestId ? eq(adminAudit.requestId, filters.requestId) : undefined,
				filters.from ? gte(adminAudit.createdAt, new Date(filters.from)) : undefined,
				filters.to ? lte(adminAudit.createdAt, new Date(filters.to)) : undefined,
			),
		)
		.orderBy(desc(adminAudit.createdAt), desc(adminAudit.id))
		.limit(limit + 1)
		.offset(offset);
	return {
		items: rows.slice(0, limit).map((row) => ({
			...row,
			metadata: sanitizeAuditMetadata(row.metadata),
			createdAt: row.createdAt.toISOString(),
		})),
		hasMore: rows.length > limit,
		limit,
		offset,
	};
}

/** Only finite operational metadata is returned; arbitrary historical strings remain server-side. */
export function sanitizeAuditMetadata(metadata: Record<string, unknown>) {
	const out: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (["suspended", "previousSuspended"].includes(key) && typeof value === "boolean")
			out[key] = value;
		if (key === "rows" && typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
			out[key] = value;
		if (
			["from", "to"].includes(key) &&
			typeof value === "string" &&
			["open", "reviewing", "actioned", "dismissed"].includes(value)
		)
			out[key] = value;
		if (
			key === "operation" &&
			typeof value === "string" &&
			["create", "edit", "disable", "subject", "status"].includes(value)
		)
			out[key] = value;
		if (
			key === "code" &&
			typeof value === "string" &&
			[
				"INVALID_PASSWORD",
				"ADMIN_PASSWORD_BLOCKED",
				"PERMISSION_DENIED",
				"ADMIN_REQUIRED",
				"ADMIN_MFA_REQUIRED",
				"ADMIN_ACTION_UNAVAILABLE",
				"ADMIN_AUDIT_UNAVAILABLE",
				"ADMIN_ACTION_INDETERMINATE",
				"CONFIRMATION_MISMATCH",
				"NOT_FOUND",
				"MODERATION_CONFLICT",
				"RATE_LIMITED",
			].includes(value)
		)
			out[key] = value;
	}
	return out;
}
