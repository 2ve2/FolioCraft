import { isStaff, type Permission, permissionsFor } from "@ichnara/contracts/admin-policy";
import { APIError, createAuthMiddleware, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { mailConfigured, requireEmailVerification } from "../../config/env";

const nativePermissions: Record<string, Permission> = {
	"/admin/list-users": "user.read",
	"/admin/get-user": "user.read",
	"/admin/list-user-sessions": "user.read",
	"/admin/ban-user": "user.ban",
	"/admin/unban-user": "user.unban",
	"/admin/revoke-user-session": "user.revoke_session",
	"/admin/revoke-user-sessions": "user.revoke_session",
	"/admin/set-role": "user.set_role",
	"/admin/remove-user": "user.remove",
	"/admin/impersonate-user": "user.impersonate",
	"/admin/set-user-password": "user.set_password",
};
const nativeReads = new Set(["/admin/list-users", "/admin/get-user", "/admin/list-user-sessions"]);

export const authHooks = {
	/** Enforces the shared policy even on in-process native calls; P2 mutations remain unavailable. */
	before: createAuthMiddleware(async (ctx) => {
		const needsMail =
			["/request-password-reset", "/send-verification-email"].includes(ctx.path) ||
			(requireEmailVerification && ["/sign-up/email", "/sign-in/email"].includes(ctx.path));
		if (needsMail && !mailConfigured)
			throw new APIError("SERVICE_UNAVAILABLE", {
				code: "MAIL_UNAVAILABLE",
				message: "Email delivery is not configured",
			});
		if (!ctx.path.startsWith("/admin/")) return;
		const session = await getAuthoritativeSessionFromCtx(ctx);
		if (!session) throw new APIError("UNAUTHORIZED");
		if (session.session.impersonatedBy)
			throw new APIError("FORBIDDEN", {
				code: "IMPERSONATION_RESTRICTED",
				message: "Impersonated administration is disabled",
			});
		if (!isStaff(session.user.role))
			throw new APIError("FORBIDDEN", {
				code: "ADMIN_REQUIRED",
				message: "An active staff account is required",
			});
		if (
			session.user.banned &&
			(!session.user.banExpires || new Date(session.user.banExpires).getTime() > Date.now())
		)
			throw new APIError("FORBIDDEN", { code: "ACCOUNT_BANNED", message: "Account is banned" });
		if (requireEmailVerification && !session.user.emailVerified)
			throw new APIError("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Verify your email" });
		const permission = nativePermissions[ctx.path];
		if (!permission || !permissionsFor(session.user.role).includes(permission))
			throw new APIError("FORBIDDEN", { code: "PERMISSION_DENIED", message: "Permission denied" });
		if (!nativeReads.has(ctx.path))
			throw new APIError("SERVICE_UNAVAILABLE", {
				code: "ADMIN_SECURITY_PENDING",
				message: "Sensitive account operations require the P2 security controls",
			});
	}),
};
