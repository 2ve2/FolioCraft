import { isStaff, type Permission, permissionsFor } from "@ichnara/contracts/admin-policy";
import {
	APIError,
	createAuthMiddleware,
	getAuthoritativeSessionFromCtx,
	isAPIError,
} from "better-auth/api";
import { expireCookie } from "better-auth/cookies";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { env, mailConfigured, requireEmailVerification } from "../../config/env";
import { db } from "../../db";
import { session as sessionTable } from "../../db/schema/auth";
import {
	appendSensitiveOutcome,
	banSchema,
	markSensitiveDenial,
	nativeSensitiveActions,
	prepareSensitiveAction,
	recordSensitiveDenial,
	removeSchema,
	type SensitiveAudit,
	sensitiveSchema,
} from "../../services/admin/sensitive-action";
import { ApiError } from "../response-helpers";
import { enrolledFactor, hasTotpSession, totpFingerprint } from "./mfa";

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

type TotpHookContext = { totpSignInAttempt?: boolean; sensitiveAudit?: SensitiveAudit };

export const authHooks = {
	/** Enforces declared internal reads and the complete security pipeline for allowed sensitive mutations. */
	before: createAuthMiddleware(async (ctx) => {
		const needsMail =
			["/request-password-reset", "/send-verification-email"].includes(ctx.path) ||
			(requireEmailVerification && ["/sign-up/email", "/sign-in/email"].includes(ctx.path));
		if (needsMail && !mailConfigured)
			throw new APIError("SERVICE_UNAVAILABLE", {
				code: "MAIL_UNAVAILABLE",
				message: "Email delivery is not configured",
			});

		if (ctx.path.startsWith("/two-factor/verify-") && ctx.body?.trustDevice === true)
			throw new APIError("BAD_REQUEST", {
				code: "TRUSTED_DEVICES_DISABLED",
				message: "Trusted devices are disabled",
			});
		if (
			["/two-factor/send-otp", "/two-factor/verify-otp"].includes(ctx.path) ||
			(ctx.path === "/two-factor/enable" && ctx.body?.method && ctx.body.method !== "totp")
		)
			throw new APIError("BAD_REQUEST", { code: "TOTP_ONLY", message: "Use an authenticator app" });
		if (["/sign-in/email", "/sign-in/username", "/sign-in/phone-number"].includes(ctx.path)) {
			const cookie = ctx.context.createAuthCookie("trust_device");
			const bare = cookie.name.replace(/^__(Secure|Host)-/, "");
			const blocked = new Set([bare, `__Secure-${bare}`, `__Host-${bare}`]);
			const headers = new Headers(ctx.headers);
			headers.set(
				"cookie",
				(headers.get("cookie") ?? "")
					.split(";")
					.filter((part) => !blocked.has(part.split("=")[0].trim()))
					.join(";"),
			);
			expireCookie(ctx, cookie);
			return { context: { headers } };
		}
		if (ctx.path === "/two-factor/verify-totp") {
			const active = await getAuthoritativeSessionFromCtx(ctx);
			return { context: { context: { totpSignInAttempt: !active } } };
		}
		if (
			[
				"/two-factor/disable",
				"/two-factor/get-totp-uri",
				"/two-factor/generate-backup-codes",
			].includes(ctx.path)
		) {
			const active = await getAuthoritativeSessionFromCtx(ctx);
			if (
				active &&
				isStaff(active.user.role) &&
				active.user.twoFactorEnabled &&
				!(await hasTotpSession(active))
			)
				throw new APIError("FORBIDDEN", {
					code: "ADMIN_MFA_REQUIRED",
					message: "Complete authenticator sign-in first",
				});
		}
		if (!ctx.path.startsWith("/admin/")) return;
		let denialActorId: string | undefined;
		try {
			const session = await getAuthoritativeSessionFromCtx(ctx);
			denialActorId = session?.user.id;
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
				throw new APIError("FORBIDDEN", {
					code: "EMAIL_NOT_VERIFIED",
					message: "Verify your email",
				});
			if (env.ADMIN_REQUIRE_MFA && !(await hasTotpSession(session)))
				throw new APIError("FORBIDDEN", {
					code: "ADMIN_MFA_REQUIRED",
					message: "Complete authenticator sign-in first",
				});
			const permission = nativePermissions[ctx.path];
			if (!permission || !permissionsFor(session.user.role).includes(permission))
				throw new APIError("FORBIDDEN", {
					code: "PERMISSION_DENIED",
					message: "Permission denied",
				});
			const action = nativeSensitiveActions[ctx.path as keyof typeof nativeSensitiveActions];
			if (action) {
				try {
					const targetSchema = (
						action === "user.ban"
							? banSchema
							: action === "user.remove"
								? removeSchema
								: sensitiveSchema
					).extend({
						userId: z.string().trim().min(1).max(128),
						...(action === "user.revoke_session"
							? { sessionId: z.string().trim().min(1).max(128) }
							: {}),
					});
					const input = targetSchema.parse(ctx.body);
					const { userId, sessionId, ...credentials } = input as typeof input & {
						sessionId?: string;
					};
					const prepared = await prepareSensitiveAction(
						session,
						new Headers(ctx.headers),
						action,
						sessionId ?? userId,
						credentials,
						userId,
					);
					const body =
						action === "user.revoke_session"
							? { sessionToken: prepared.token }
							: action === "user.ban"
								? {
										userId,
										banReason: prepared.data.reason,
										banExpiresIn: (prepared.data as { banExpiresIn?: number }).banExpiresIn,
									}
								: { userId };
					// Dispatch deep-merges returned bodies: erase extensions from the original as well.
					for (const key of Object.keys(ctx.body)) delete ctx.body[key];
					return { context: { body, context: { sensitiveAudit: prepared.audit } } };
				} catch (error) {
					await recordSensitiveDenial(session.user.id, action, error as object);
					if (error instanceof ApiError || error instanceof z.ZodError) {
						const rejection = new APIError(
							error instanceof ApiError ? (error.status as 400) : "BAD_REQUEST",
							{
								code: error instanceof ApiError ? error.code : "VALIDATION_ERROR",
								message: "Action rejected",
							},
						);
						markSensitiveDenial(rejection);
						throw rejection;
					}
					throw error;
				}
			}
			if (!nativeReads.has(ctx.path))
				throw new APIError("SERVICE_UNAVAILABLE", {
					code: "ADMIN_ACTION_UNAVAILABLE",
					message: "This administrative operation is unavailable",
				});
		} catch (error) {
			const action = nativeSensitiveActions[ctx.path as keyof typeof nativeSensitiveActions];
			if (action && denialActorId)
				await recordSensitiveDenial(denialActorId, action, error as object);
			throw error;
		}
	}),
	/** Appends sensitive outcomes and marks only native TOTP challenge sign-ins as proven sessions. */
	after: createAuthMiddleware(async (ctx) => {
		const audit = (ctx.context as typeof ctx.context & TotpHookContext).sensitiveAudit;
		if (audit && Object.hasOwn(nativeSensitiveActions, ctx.path)) {
			try {
				await appendSensitiveOutcome(
					audit,
					isAPIError(ctx.context.returned) ? "failed" : "succeeded",
				);
				if (isAPIError(ctx.context.returned)) markSensitiveDenial(ctx.context.returned);
			} catch {
				throw new APIError("SERVICE_UNAVAILABLE", {
					code: "ADMIN_ACTION_INDETERMINATE",
					message: "Check the audit before retrying",
				});
			}
			return;
		}
		if (
			ctx.path !== "/two-factor/verify-totp" ||
			!(ctx.context as typeof ctx.context & TotpHookContext).totpSignInAttempt ||
			isAPIError(ctx.context.returned)
		)
			return;
		const issued = ctx.context.newSession;
		if (!issued?.user.twoFactorEnabled || issued.session.impersonatedBy) return;
		const factor = await enrolledFactor(issued.user.id);
		if (!factor) return;
		await db
			.update(sessionTable)
			.set({ adminTotpFactor: totpFingerprint(factor) })
			.where(and(eq(sessionTable.id, issued.session.id), eq(sessionTable.userId, issued.user.id)));
	}),
};
