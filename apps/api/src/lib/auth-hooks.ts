import {
	APIError,
	createAuthMiddleware,
	getAuthoritativeSessionFromCtx,
	isAPIError,
} from "better-auth/api";
import { eq } from "drizzle-orm";
import { env, mailConfigured } from "../config/env";
import { db } from "../db";
import { adminAudit } from "../db/schema/admin";

const auditedAdminPaths = new Set([
	"/admin/set-role",
	"/admin/create-user",
	"/admin/update-user",
	"/admin/ban-user",
	"/admin/unban-user",
	"/admin/impersonate-user",
	"/admin/stop-impersonating",
	"/admin/revoke-user-session",
	"/admin/revoke-user-sessions",
	"/admin/remove-user",
	"/admin/set-user-password",
]);

type NativeAuditContext = { nativeAdminAudit?: { id: string; action: string } };

/** Checks the fixed platform role without deriving privileges from request data. */
function hasAdminRole(role: unknown) {
	return typeof role === "string" && role.split(",").includes("admin");
}

/** Treats an expired timed ban as inactive while preserving Better Auth's expiry behavior. */
function isActivelyBanned(user: Record<string, unknown>) {
	if (!user.banned) return false;
	if (!user.banExpires) return true;
	const expiration =
		user.banExpires instanceof Date
			? user.banExpires.getTime()
			: new Date(String(user.banExpires)).getTime();
	return expiration > Date.now();
}

export const authHooks = {
	/** Verifies original sessions and durably records native mutation intent before execution. */
	before: createAuthMiddleware(async (ctx) => {
		const needsMail =
			["/request-password-reset", "/send-verification-email"].includes(ctx.path) ||
			(env.NODE_ENV === "production" && ["/sign-up/email", "/sign-in/email"].includes(ctx.path));
		if (needsMail && !mailConfigured)
			throw new APIError("SERVICE_UNAVAILABLE", {
				code: "MAIL_UNAVAILABLE",
				message: "Email delivery is not configured",
			});
		if (!ctx.path.startsWith("/admin/")) return;
		const session = await getAuthoritativeSessionFromCtx(ctx);
		if (!session) throw new APIError("UNAUTHORIZED");
		let actor = session;
		if (ctx.path === "/admin/stop-impersonating") {
			const cookie = ctx.context.createAuthCookie("admin_session");
			const originalCookie = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
			const original = originalCookie
				? await ctx.context.internalAdapter.findSession(originalCookie.split(":")[0])
				: null;
			if (
				!original ||
				original.session.expiresAt <= new Date() ||
				original.user.id !== session.session.impersonatedBy ||
				original.session.impersonatedBy
			)
				throw new APIError("FORBIDDEN", {
					code: "ADMIN_REQUIRED",
					message: "An original admin session is required",
				});
			actor = original;
		} else if (session.session.impersonatedBy) {
			throw new APIError("FORBIDDEN", {
				code: "IMPERSONATION_RESTRICTED",
				message: "Stop impersonating before administering the platform",
			});
		}
		if (!hasAdminRole(actor.user.role) || isActivelyBanned(actor.user))
			throw new APIError("FORBIDDEN", {
				code: "ADMIN_REQUIRED",
				message: "An active admin account is required",
			});
		if (env.NODE_ENV === "production" && !actor.user.emailVerified)
			throw new APIError("FORBIDDEN", {
				code: "EMAIL_NOT_VERIFIED",
				message: "Verify your email before administering the platform",
			});
		if (!auditedAdminPaths.has(ctx.path)) return;
		const id = crypto.randomUUID();
		const action = `auth.${ctx.path.slice("/admin/".length)}`;
		let targetId =
			typeof ctx.body?.userId === "string" && ctx.body.userId.length <= 128
				? ctx.body.userId
				: null;
		const singleSession = ctx.path === "/admin/revoke-user-session";
		if (singleSession && typeof ctx.body?.sessionToken === "string") {
			const target = await ctx.context.internalAdapter.findSession(ctx.body.sessionToken);
			targetId = target?.session.id ?? null;
		}
		await db.insert(adminAudit).values({
			id,
			actorId: actor.user.id,
			action,
			targetType: singleSession ? "session" : "user",
			targetId,
			requestId: crypto.randomUUID(),
			status: "attempted",
			metadata: {},
		});
		// The hook return wraps the endpoint context; auth context is its nested context property.
		return { context: { context: { nativeAdminAudit: { id, action } } } };
	}),
	/** Finalizes only allowlisted native mutations; no passwords, tokens or user payloads are stored. */
	after: createAuthMiddleware(async (ctx) => {
		const audit = (ctx.context as typeof ctx.context & NativeAuditContext).nativeAdminAudit;
		if (!audit) return;
		const failed = isAPIError(ctx.context.returned);
		const response = ctx.context.returned as { user?: { id?: unknown } } | undefined;
		const createdId =
			audit.action === "auth.create-user" && typeof response?.user?.id === "string"
				? response.user.id
				: undefined;
		await db
			.update(adminAudit)
			.set({
				status: failed ? "failed" : "succeeded",
				...(createdId ? { targetId: createdId } : {}),
			})
			.where(eq(adminAudit.id, audit.id));
	}),
};
