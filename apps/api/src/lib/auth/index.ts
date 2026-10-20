import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { newId } from "@ichnara/contracts";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { twoFactor } from "better-auth/plugins/two-factor";
import { env, requireEmailVerification } from "../../config/env";
import { db } from "../../db";
import * as schema from "../../db/schema/auth";
import { accessControl, accessRoles } from "./access";
import { authHooks } from "./hooks";
import { sendAuthMail } from "./mail";

export const auth = betterAuth({
	appName: "Ichnara",
	plugins: [
		twoFactor({ issuer: "Ichnara", skipVerificationOnEnable: false, allowPasswordless: false }),
		admin({
			ac: accessControl,
			roles: accessRoles,
			adminRoles: ["owner", "moderator", "support", "analyst"],
			allowImpersonatingAdmins: false,
		}),
	],
	logger: {
		level: "warn",

		/** Emits severity only, keeping protocol payloads and credentials out of logs. */
		log(level) {
			console.warn(JSON.stringify({ event: "auth_warning_or_error", level }));
		},
	},
	baseURL: env.API_URL,
	secret: env.BETTER_AUTH_SECRET,
	secrets: env.BETTER_AUTH_SECRETS,
	database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
	trustedOrigins: [env.WEB_URL],
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 10,
		requireEmailVerification,
		revokeSessionsOnPasswordReset: true,

		/** Delivers the native reset link using the configured project mail transport. */
		sendResetPassword: async ({ user, url }) => {
			await sendAuthMail(user.email, user.name, url, "reset");
		},
	},
	emailVerification: {
		sendOnSignUp: requireEmailVerification,
		sendOnSignIn: requireEmailVerification,
		autoSignInAfterVerification: false,

		/** Delivers the native verification link using the configured project mail transport. */
		sendVerificationEmail: async ({ user, url }) => {
			await sendAuthMail(user.email, user.name, url, "verify");
		},
	},
	hooks: authHooks,
	session: {
		cookieCache: { enabled: false },
		additionalFields: {
			adminTotpFactor: { type: "string", required: false, input: false, returned: false },
		},
	},
	advanced: {
		// Record ids only; Better Auth generates session and verification tokens separately.
		database: { generateId: () => newId() },
		useSecureCookies: env.NODE_ENV === "production",
		ipAddress: { ipAddressHeaders: ["x-folio-client-ip"] },
	},
	rateLimit: {
		enabled: true,
		storage: "database",
		modelName: "rateLimit",
		window: 60,
		max: 100,
		customRules: {
			"/sign-in/email": { window: 60, max: 10 },
			"/sign-up/email": { window: 60, max: 5 },
			"/request-password-reset": { window: 60, max: 5 },
			"/send-verification-email": { window: 60, max: 5 },
		},
	},
});
