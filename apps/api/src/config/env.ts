import { z } from "zod";

/** Normalizes empty optional environment values before validating their schema. */
const optional = <T extends z.ZodType>(s: T) =>
	z.preprocess((v) => (v === "" ? undefined : v), s.optional());

/** Accepts only plain HTTP origins without paths or embedded credentials. */
const origin = z.url().refine((v) => {
	const u = new URL(v);
	return ["http:", "https:"].includes(u.protocol) && u.origin === v && !u.username && !u.password;
}, "Expected an HTTP(S) origin without a path");
export const envSchema = z
	.object({
		DATABASE_URL: z.string().startsWith("postgresql://"),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_SECRETS: optional(
			z
				.string()
				.superRefine((value, context) => {
					const entries = value.split(",");
					const versions = new Set<number>();
					for (const entry of entries) {
						const separator = entry.indexOf(":");
						const version = entry.slice(0, separator);
						if (
							separator < 1 ||
							!/^\d+$/.test(version) ||
							!Number.isSafeInteger(Number(version)) ||
							versions.has(Number(version)) ||
							entry.slice(separator + 1).length < 32
						)
							context.addIssue({
								code: "custom",
								message:
									"Expected unique version:secret entries with secrets at least 32 characters",
							});
						versions.add(Number(version));
					}
				})
				.transform((value) =>
					value.split(",").map((entry) => ({
						version: Number(entry.slice(0, entry.indexOf(":"))),
						value: entry.slice(entry.indexOf(":") + 1),
					})),
				),
		),
		ADMIN_REQUIRE_MFA: z
			.enum(["true", "false"])
			.default("true")
			.transform((value) => value === "true"),
		ADMIN_PASSWORD_MAX_FAILURES: z.coerce.number().int().min(1).max(100).default(5),
		ADMIN_PASSWORD_WINDOW_SECONDS: z.coerce.number().int().min(1).max(86400).default(900),
		ADMIN_PASSWORD_BLOCK_SECONDS: z.coerce.number().int().min(1).max(86400).default(900),
		API_URL: origin,
		WEB_URL: origin,
		PORT: z.coerce.number().int().min(1).max(65535).default(4000),
		HOST: z.string().default("127.0.0.1"),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		TRIAL_SKIP_EMAIL_VERIFICATION: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
		DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(5000),
		DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
		TRUSTED_PROXY_IPS: z.string().default(""),
		R2_ACCOUNT_ID: optional(z.string().regex(/^[a-f0-9]{32}$/)),
		R2_BUCKET: optional(z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/)),
		R2_ACCESS_KEY_ID: optional(z.string().min(1)),
		R2_SECRET_ACCESS_KEY: optional(z.string().min(1)),
		R2_ENDPOINT: optional(z.url()),
		SMTP_HOST: optional(z.string().min(1)),
		SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		SMTP_USER: optional(z.string().min(1)),
		SMTP_PASSWORD: optional(z.string().min(1)),
		MAIL_FROM: optional(z.email()),
	})
	.superRefine((v, ctx) => {
		/** Rejects incomplete provider configuration groups. */
		const checkGroup = (keys: (keyof typeof v)[]) => {
			const n = keys.filter((k) => v[k] !== undefined).length;
			if (n !== 0 && n !== keys.length)
				ctx.addIssue({ code: "custom", message: `Configure all of ${keys.join(", ")} or none` });
		};

		checkGroup(["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
		checkGroup(["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"]);
		if (v.R2_ENDPOINT) {
			const u = new URL(v.R2_ENDPOINT as string);
			if (
				!v.R2_ACCOUNT_ID ||
				u.protocol !== "https:" ||
				u.port ||
				u.username ||
				u.password ||
				u.pathname !== "/" ||
				u.search ||
				u.hash ||
				![
					`${v.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
					`${v.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
					`${v.R2_ACCOUNT_ID}.fedramp.r2.cloudflarestorage.com`,
				].includes(u.hostname)
			)
				ctx.addIssue({
					code: "custom",
					path: ["R2_ENDPOINT"],
					message: "Expected this account's HTTPS Cloudflare R2 S3 endpoint",
				});
		}
		if (v.NODE_ENV === "production") {
			if (!v.ADMIN_REQUIRE_MFA)
				ctx.addIssue({
					code: "custom",
					path: ["ADMIN_REQUIRE_MFA"],
					message: "Production administration requires MFA",
				});
			if (!v.API_URL.startsWith("https://") || !v.WEB_URL.startsWith("https://"))
				ctx.addIssue({ code: "custom", message: "Production origins require HTTPS" });
			if (!v.SMTP_HOST && !v.TRIAL_SKIP_EMAIL_VERIFICATION)
				ctx.addIssue({
					code: "custom",
					message: "Production authentication requires configured SMTP verification/reset delivery",
				});
		}
	});
export const env = envSchema.parse(process.env);
export const requireEmailVerification =
	env.NODE_ENV === "production" && !env.TRIAL_SKIP_EMAIL_VERIFICATION;
export const storageConfigured = Boolean(
	env.R2_ACCOUNT_ID && env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY,
);
export const mailConfigured = Boolean(
	env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM,
);
export const integrationStatus = {
	storage: storageConfigured ? "configured" : "disabled",
	mail: mailConfigured ? "configured" : "disabled",
} as const;
