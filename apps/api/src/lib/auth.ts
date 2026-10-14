import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { env } from "../config/env";
import { db } from "../db";
import * as schema from "../db/schema/auth";
import { authHooks } from "./auth-hooks";
import { sendAuthMail } from "./mail";

export const auth = betterAuth({
	appName: "FolioCraft",
	plugins: [admin()],
	logger: {
		level: "warn",
		/** Emits severity only, keeping protocol payloads and credentials out of logs. */
		log(level) {
			console.warn(JSON.stringify({ event: "auth_warning_or_error", level }));
		},
	},
	baseURL: env.API_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
	trustedOrigins: [env.WEB_URL],
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 10,
		requireEmailVerification: env.NODE_ENV === "production",
		revokeSessionsOnPasswordReset: true,
		/** Delivers the native reset link using the configured project mail transport. */
		sendResetPassword: async ({ user, url }) => {
			await sendAuthMail(user.email, user.name, url, "reset");
		},
	},
	emailVerification: {
		sendOnSignUp: env.NODE_ENV === "production",
		sendOnSignIn: env.NODE_ENV === "production",
		autoSignInAfterVerification: false,
		/** Delivers the native verification link using the configured project mail transport. */
		sendVerificationEmail: async ({ user, url }) => {
			await sendAuthMail(user.email, user.name, url, "verify");
		},
	},
	hooks: authHooks,
	session: { cookieCache: { enabled: false } },
	advanced: {
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
