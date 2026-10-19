import { isStaff, type Permission, permissionsFor } from "@ichnara/contracts/admin-policy";
import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env, requireEmailVerification } from "../../config/env";
import { db } from "../../db";
import { session, user } from "../../db/schema/auth";
import { sites } from "../../db/schema/site";
import { hasTotpSession } from "../../lib/auth/mfa";
import { ApiError } from "../../lib/response-helpers";
import { rateLimitService } from "../rate-limit";
import type { DraftTransaction } from "../sites/draft-service";
import { type AuditContext, recordAdminAction } from "./audit-service";
import { passwordFailures } from "./password-failures";

export const sensitiveSchema = z
	.object({
		reason: z.string().trim().min(10).max(500),
		password: z.string().min(1).max(1024),
	})
	.strict();
export const removeSchema = sensitiveSchema.extend({ confirmation: z.string().min(1).max(128) });
export const banSchema = sensitiveSchema.extend({
	banExpiresIn: z.number().int().min(1).max(31_536_000).optional(),
});
export const nativeSensitiveActions = {
	"/admin/ban-user": "user.ban",
	"/admin/remove-user": "user.remove",
	"/admin/unban-user": "user.unban",
	"/admin/revoke-user-session": "user.revoke_session",
	"/admin/revoke-user-sessions": "user.revoke_sessions",
} as const;
export type SensitiveAction =
	| (typeof nativeSensitiveActions)[keyof typeof nativeSensitiveActions]
	| "user.read_email"
	| "site.suspend"
	| "site.resume"
	| "notice.manage"
	| "audit.export"
	| "request.handle"
	| "request.export";
export type SensitiveActor = {
	user: {
		id: string;
		role?: string | null;
		banned?: boolean | null;
		banExpires?: Date | null;
		emailVerified: boolean;
		twoFactorEnabled?: boolean | null;
	};
	session: { id: string; impersonatedBy?: string | null };
};
export type SensitiveAudit = AuditContext & {
	reason: string;
	action: SensitiveAction;
	targetType: "site" | "user" | "session" | "notice" | "audit" | "request";
	targetId: string;
};
const recordedDenials = new WeakSet<object>();

/** Maps only this batch's finite live routes to denial budgets; arbitrary paths never create keys. */
export function sensitiveRoute(path: string): SensitiveAction | undefined {
	if (/^\/api\/admin\/notices(?:\/[^/]+(?:\/disable)?)?$/.test(path)) return "notice.manage";
	if (/^\/api\/admin\/requests(?:\/[^/]+(?:\/(?:status|subject|export))?)?$/.test(path))
		return path.endsWith("/export") ? "request.export" : "request.handle";
	if (path === "/api/admin/audit/export") return "audit.export";
	const match =
		/^\/api\/admin\/(users|sites)\/[^/]+\/(ban|unban|revoke-sessions|reveal-email|remove|suspend|resume)$/.exec(
			path,
		);
	if (match?.[1] === "users") {
		if (match[2] === "reveal-email") return "user.read_email";
		if (match[2] === "remove") return "user.remove";
		if (match[2] === "ban") return "user.ban";
		if (match[2] === "unban") return "user.unban";
		if (match[2] === "revoke-sessions") return "user.revoke_sessions";
	}
	if (match?.[1] === "sites" && ["suspend", "resume"].includes(match[2]))
		return `site.${match[2]}` as SensitiveAction;
	if (/^\/api\/admin\/users\/[^/]+\/sessions\/[^/]+\/revoke$/.test(path))
		return "user.revoke_session";
}

/** Appends at most ten sanitized pre-execution failures per authenticated actor/action per minute. */
export async function recordSensitiveDenial(
	actorId: string,
	action: SensitiveAction,
	error: object,
) {
	if (recordedDenials.has(error)) return;
	recordedDenials.add(error);
	const limit = await rateLimitService.consume(`admin-denial:${actorId}:${action}`, 10, 60);
	if (!limit.allowed) return;
	const code =
		error instanceof ApiError
			? error.code
			: isAPIError(error)
				? error.body?.code
				: "VALIDATION_ERROR";
	await recordAdminAction(
		db,
		{ actorId, requestId: crypto.randomUUID(), status: "failed" },
		"permission_denied",
		action.startsWith("site.") ? "site" : "user",
		"",
		{
			action,
			code: typeof code === "string" && /^[A-Z_]{1,64}$/.test(code) ? code : "REQUEST_REJECTED",
		},
	);
}

/** Preserves the recorded-denial marker when translating native errors to safe domain errors. */
export function translateSensitiveError(error: unknown): never {
	if (!isAPIError(error)) throw new ApiError(503, "ADMIN_ACTION_INDETERMINATE");
	const code = error.body?.code;
	const mapped = new ApiError(
		error.statusCode as 400,
		typeof code === "string" ? code : "ADMIN_ACTION_FAILED",
	);
	if (recordedDenials.has(error)) recordedDenials.add(mapped);
	throw mapped;
}

/** Treats every role except exactly the known ordinary user as protected, including mixed roles. */
export async function requireOrdinaryTarget(
	id: string,
	executor: typeof db | DraftTransaction = db,
) {
	const [target] = await executor
		.select({ id: user.id, role: user.role })
		.from(user)
		.where(eq(user.id, id))
		.limit(1);
	if (!target) throw new ApiError(404, "NOT_FOUND");
	if (target.role?.trim() !== "user") throw new ApiError(503, "ADMIN_ACTION_UNAVAILABLE");
	return target;
}

/** Resolves site/session ownership from storage; browser session tokens are never accepted. */
export async function resolveSensitiveTarget(
	action: SensitiveAction,
	id: string,
	expectedUserId?: string,
) {
	if (action === "notice.manage" || action === "audit.export" || action.startsWith("request."))
		return;
	if (action.startsWith("site.")) {
		const [site] = await db
			.select({ ownerId: sites.ownerId })
			.from(sites)
			.where(eq(sites.id, id))
			.limit(1);
		if (!site) throw new ApiError(404, "NOT_FOUND");
		await requireOrdinaryTarget(site.ownerId);
		return;
	}
	if (action === "user.revoke_session") {
		const [stored] = await db.select().from(session).where(eq(session.id, id)).limit(1);
		if (!stored || stored.userId !== expectedUserId) throw new ApiError(404, "NOT_FOUND");
		await requireOrdinaryTarget(stored.userId);
		return stored.token;
	}
	await requireOrdinaryTarget(id);
}

/** Validates the actor again at execution, without imposing session age or changing freshAge. */
export async function requireSensitiveActor(actor: SensitiveActor, action: SensitiveAction) {
	if (!isStaff(actor.user.role) || actor.session.impersonatedBy)
		throw new ApiError(403, "ADMIN_REQUIRED");
	if (actor.user.banned && (!actor.user.banExpires || actor.user.banExpires > new Date()))
		throw new ApiError(403, "ACCOUNT_BANNED");
	if (requireEmailVerification && !actor.user.emailVerified)
		throw new ApiError(403, "EMAIL_NOT_VERIFIED");
	if (env.ADMIN_REQUIRE_MFA && !(await hasTotpSession(actor)))
		throw new ApiError(403, "ADMIN_MFA_REQUIRED");
	const permission: Permission = action === "user.revoke_sessions" ? "user.revoke_session" : action;
	if (!permissionsFor(actor.user.role).includes(permission))
		throw new ApiError(403, "PERMISSION_DENIED");
}

/** Verifies the operator's native password and persists the attempt before any mutation can run. */
export async function prepareSensitiveAction(
	actor: SensitiveActor,
	headers: Headers,
	action: SensitiveAction,
	id: string,
	input: unknown,
	expectedUserId?: string,
) {
	await requireSensitiveActor(actor, action);
	const data = (
		action === "user.ban" ? banSchema : action === "user.remove" ? removeSchema : sensitiveSchema
	).parse(input);
	await resolveSensitiveTarget(action, id, expectedUserId);
	if (action === "user.remove" && (data as unknown as { confirmation: string }).confirmation !== id)
		throw new ApiError(400, "CONFIRMATION_MISMATCH");
	await passwordFailures.check(actor.user.id);
	const { auth } = await import("../../lib/auth");
	try {
		const verified = await auth.api.verifyPassword({ headers, body: { password: data.password } });
		if (!verified.status) throw new ApiError(400, "INVALID_PASSWORD");
	} catch (error) {
		if (
			(error instanceof ApiError && error.code === "INVALID_PASSWORD") ||
			(isAPIError(error) && error.body?.code === "INVALID_PASSWORD")
		)
			await passwordFailures.fail(actor.user.id);
		if (isAPIError(error)) translateSensitiveError(error);
		throw error;
	}
	await passwordFailures.check(actor.user.id);
	const current = await auth.api.getSession({ headers });
	if (!current || current.user.id !== actor.user.id || current.session.id !== actor.session.id)
		throw new ApiError(401, "UNAUTHORIZED");
	await requireSensitiveActor(current, action);
	const token = await resolveSensitiveTarget(action, id, expectedUserId);
	const audit: SensitiveAudit = {
		actorId: actor.user.id,
		requestId: crypto.randomUUID(),
		reason: data.reason,
		action,
		targetType: action.startsWith("request.")
			? "request"
			: action === "notice.manage"
				? "notice"
				: action === "audit.export"
					? "audit"
					: action.startsWith("site.")
						? "site"
						: action === "user.revoke_session"
							? "session"
							: "user",
		targetId: id,
	};
	await appendSensitiveOutcome(audit, "attempted");
	return { audit, data, token };
}

/** Inserts a new audit row; an outcome failure leaves the durable attempt for reconciliation. */
export async function appendSensitiveOutcome(
	audit: SensitiveAudit,
	status: "attempted" | "succeeded" | "failed",
) {
	const { action, targetType, targetId, ...context } = audit;
	try {
		await recordAdminAction(db, { ...context, status }, action, targetType, targetId);
	} catch {
		throw new ApiError(
			503,
			status === "attempted" ? "ADMIN_AUDIT_UNAVAILABLE" : "ADMIN_ACTION_INDETERMINATE",
		);
	}
}

/** Carries sanitized bookkeeping across native/domain error conversion, never authority to execute. */
export function markSensitiveDenial(error: object) {
	recordedDenials.add(error);
}
