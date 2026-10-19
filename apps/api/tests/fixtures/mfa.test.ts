import "../test-guard";
import { afterAll, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { betterAuth } from "better-auth";
import { and, eq, inArray } from "drizzle-orm";
import { env, envSchema } from "../../src/config/env";
import { db } from "../../src/db";
import { adminAudit } from "../../src/db/schema/admin";
import { session, twoFactor, user, verification } from "../../src/db/schema/auth";
import { rateBuckets } from "../../src/db/schema/operations";
import { auth } from "../../src/lib/auth";
import { passwordFailures } from "../../src/services/admin/password-failures";
import { request } from "../helpers";

const enabled = env.ADMIN_REQUIRE_MFA;
const ids: string[] = [];
type AuthEngine = { handler: (request: Request) => Promise<Response> };
const password = "Mfa-fixture-password-only-123";

/** Maintains response cookies like a browser without logging their values. */
function cookies(response: Response, previous = "") {
	const jar = new Map(
		previous
			.split(";")
			.filter(Boolean)
			.map((item) => {
				const [key, ...value] = item.trim().split("=");
				return [key, value.join("=")];
			}),
	);
	for (const header of response.headers.getSetCookie()) {
		const [key, ...value] = header.split(";")[0].split("=");
		if (value.join("=")) jar.set(key, value.join("="));
		else jar.delete(key);
	}
	return [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
}

/** Exercises real native HTTP and hooks using only synthetic local users and test keys. */
async function native(engine: AuthEngine, path: string, body: unknown, cookie = "") {
	return engine.handler(
		new Request(`${env.API_URL}/api/auth${path}`, {
			method: "POST",
			headers: {
				Origin: env.WEB_URL,
				"Content-Type": "application/json",
				Cookie: cookie,
				"x-folio-client-ip": `127.88.${Math.floor(Math.random() * 254)}.1`,
			},
			body: JSON.stringify(body),
		}),
	);
}

/** Creates a removable local auth identity; only disposable fixtures receive synthetic staff roles. */
async function fixture(role = "user", engine: AuthEngine = auth) {
	const email = `mfa-${crypto.randomUUID()}@example.com`;
	const response = await native(engine, "/sign-up/email", { email, password, name: "MFA fixture" });
	expect(response.status).toBe(200);
	const body = (await response.json()) as { user: { id: string } };
	ids.push(body.user.id);
	if (role !== "user") await db.update(user).set({ role }).where(eq(user.id, body.user.id));
	return { id: body.user.id, email, cookie: cookies(response) };
}

/** Computes an authenticator-compatible RFC 6238 code from the URI's base32 key. */
async function code(secret: string) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const bits = [...secret.replace(/=+$/, "").toUpperCase()]
		.map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
		.join("");
	const key = Buffer.from(bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? []);
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
	const hash = createHmac("sha1", key).update(counter).digest();
	const offset = hash[hash.length - 1] & 15;
	return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

/** Performs real enrollment and returns setup state only in this test's memory. */
async function enroll(actor: Awaited<ReturnType<typeof fixture>>, engine: AuthEngine = auth) {
	const start = await native(
		engine,
		"/two-factor/enable",
		{ password, method: "totp" },
		actor.cookie,
	);
	expect(start.status).toBe(200);
	const data = (await start.json()) as { totpURI: string; backupCodes: string[] };
	const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
	expect(secret.length).toBeGreaterThan(0);
	const verified = await native(
		engine,
		"/two-factor/verify-totp",
		{ code: await code(secret) },
		actor.cookie,
	);
	expect(verified.status).toBe(200);
	actor.cookie = cookies(verified, actor.cookie);
	return { secret, backupCodes: data.backupCodes };
}

/** Starts a challenge using cookies signed by that exact engine/key set. */
async function challenge(
	actor: Awaited<ReturnType<typeof fixture>>,
	engine: AuthEngine = auth,
	extraCookie = "",
) {
	const response = await native(
		engine,
		"/sign-in/email",
		{ email: actor.email, password },
		extraCookie,
	);
	expect(response.status).toBe(200);
	expect(((await response.json()) as { twoFactorRedirect?: boolean }).twoFactorRedirect).toBe(true);
	return cookies(response);
}

afterAll(async () => {
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(verification).where(inArray(verification.value, ids));
		await db.delete(user).where(inArray(user.id, ids));
		expect(await db.select({ id: user.id }).from(user).where(inArray(user.id, ids))).toHaveLength(
			0,
		);
		expect(
			await db
				.select({ id: adminAudit.id })
				.from(adminAudit)
				.where(inArray(adminAudit.actorId, ids)),
		).toHaveLength(0);
		console.info(
			JSON.stringify({ event: "mfa_fixture_cleanup", usersRemaining: 0, actorAuditRemaining: 0 }),
		);
	}
});

test.skipIf(!enabled)(
	"MFA config defaults, production rejection and versioned secret validation",
	() => {
		const base = {
			DATABASE_URL: "postgresql://fixture@localhost/folio_test",
			BETTER_AUTH_SECRET: "synthetic-legacy-key-at-least-32-chars",
			API_URL: "https://api.example.com",
			WEB_URL: "https://app.example.com",
			NODE_ENV: "production",
			REPORT_IP_SALT: "synthetic-report-salt-at-least-32-characters",
			TRIAL_SKIP_EMAIL_VERIFICATION: "true",
		};
		expect(envSchema.parse(base).ADMIN_REQUIRE_MFA).toBe(true);
		expect(envSchema.safeParse({ ...base, ADMIN_REQUIRE_MFA: "false" }).success).toBe(false);
		expect(envSchema.safeParse({ ...base, ADMIN_REQUIRE_MFA: "invalid" }).success).toBe(false);
		expect(
			envSchema.parse({ ...base, NODE_ENV: "test", ADMIN_REQUIRE_MFA: "false" }).ADMIN_REQUIRE_MFA,
		).toBe(false);
		for (const value of [
			"1:short",
			"1:synthetic-long-key-at-least-32-chars,1:synthetic-another-key-at-least-32-chars",
			"-1:synthetic-long-key-at-least-32-chars",
		])
			expect(envSchema.safeParse({ ...base, BETTER_AUTH_SECRETS: value }).success).toBe(false);
		expect(
			envSchema.parse({
				...base,
				BETTER_AUTH_SECRETS:
					"2:synthetic-next-key-at-least-32-chars,1:synthetic-old-key-at-least-32-chars",
			}).BETTER_AUTH_SECRETS?.length,
		).toBe(2);
	},
);

test.skipIf(!enabled)(
	"only TOTP challenge sessions enter admin; enrollment, old sessions and backup recovery cannot",
	async () => {
		const actor = await fixture("owner");
		for (const path of ["/api/admin", "/api/admin/me/permissions", "/api/admin/sites"]) {
			const denied = await request(path, "GET", undefined, actor.cookie);
			expect(denied.status).toBe(403);
			expect((await denied.json()).code).toBe("ADMIN_MFA_REQUIRED");
		}
		const secondLogin = await native(auth, "/sign-in/email", { email: actor.email, password });
		const separateSession = cookies(secondLogin);
		const original = actor.cookie;
		const setup = await enroll(actor);
		const [factor] = await db.select().from(twoFactor).where(eq(twoFactor.userId, actor.id));
		expect(factor.verified).toBe(true);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, actor.cookie)).status,
		).toBe(403);
		expect((await request("/api/admin/me/permissions", "GET", undefined, original)).status).toBe(
			401,
		);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, separateSession)).status,
		).toBe(403);
		const existingVerify = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret), adminTotpFactor: "forged" },
			separateSession,
		);
		expect(existingVerify.status).toBe(200);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, separateSession)).status,
		).toBe(403);
		await expect(
			auth.api.listUsers({
				headers: new Headers({ Cookie: separateSession }),
				query: { limit: 1 },
			}),
		).rejects.toMatchObject({ statusCode: 403, body: { code: "ADMIN_MFA_REQUIRED" } });
		const pending = await challenge(actor);
		expect((await request("/api/admin/me/permissions", "GET", undefined, pending)).status).toBe(
			401,
		);
		const rejected = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret), trustDevice: true },
			pending,
		);
		expect(rejected.status).toBe(400);
		expect((await rejected.json()).code).toBe("TRUSTED_DEVICES_DISABLED");
		const verified = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret), trustDevice: false },
			pending,
		);
		expect(verified.status).toBe(200);
		const authenticated = cookies(verified, pending);
		const permission = await request("/api/admin/me/permissions", "GET", undefined, authenticated);
		expect(permission.status).toBe(200);
		expect(
			(
				await auth.api.listUsers({
					headers: new Headers({ Cookie: authenticated }),
					query: { limit: 1 },
					asResponse: true,
				})
			).status,
		).toBe(200);
		expect(
			(await request("/api/auth/admin/list-users", "GET", undefined, authenticated)).status,
		).toBe(403);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, separateSession)).status,
		).toBe(403);
		expect(
			(await native(auth, "/two-factor/verify-totp", { code: await code(setup.secret) }, pending))
				.status,
		).toBe(401);
		const [proven] = await db
			.select()
			.from(session)
			.where(
				and(
					eq(session.userId, actor.id),
					eq(
						session.adminTotpFactor,
						(await db.select().from(session).where(eq(session.userId, actor.id))).find(
							(row) => row.adminTotpFactor,
						)?.adminTotpFactor ?? "",
					),
				),
			);
		expect(proven.adminTotpFactor?.length).toBe(64);
		const publicSession = await request("/api/auth/get-session", "GET", undefined, authenticated);
		expect(JSON.stringify(await publicSession.json())).not.toContain("adminTotpFactor");
		// Native freshness is unchanged: proof is not tied to session age or an artificial password window.
		await db
			.update(session)
			.set({ createdAt: new Date(Date.now() - 3 * 86400000) })
			.where(eq(session.id, proven.id));
		expect((await request("/api/admin/sites", "GET", undefined, authenticated)).status).toBe(200);
		const backupChallenge = await challenge(actor);
		const recovered = await native(
			auth,
			"/two-factor/verify-backup-code",
			{ code: setup.backupCodes[0], trustDevice: false },
			backupChallenge,
		);
		expect(recovered.status).toBe(200);
		const recoveryCookie = cookies(recovered, backupChallenge);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, recoveryCookie)).status,
		).toBe(403);
		expect((await native(auth, "/two-factor/disable", { password }, recoveryCookie)).status).toBe(
			403,
		);
		expect(
			(await native(auth, "/two-factor/get-totp-uri", { password }, recoveryCookie)).status,
		).toBe(403);
		const disable = await native(auth, "/two-factor/disable", { password }, authenticated);
		expect(disable.status).toBe(200);
		expect(
			(
				await request(
					"/api/admin/me/permissions",
					"GET",
					undefined,
					cookies(disable, authenticated),
				)
			).status,
		).toBe(403);
		expect(await db.select().from(twoFactor).where(eq(twoFactor.userId, actor.id))).toHaveLength(0);
	},
);

test.skipIf(!enabled)(
	"trusted cookies cannot skip TOTP and factor replacement/revocation invalidates proof",
	async () => {
		const actor = await fixture("support");
		const setup = await enroll(actor);
		// Mint a valid native-format trusted cookie with synthetic test signing keys, not a fake random value.
		const identifier = `trust-device-${crypto.randomUUID()}`;
		await db.insert(verification).values({
			id: crypto.randomUUID(),
			identifier,
			value: actor.id,
			expiresAt: new Date(Date.now() + 60000),
		});
		const trustToken = createHmac("sha256", env.BETTER_AUTH_SECRET)
			.update(`${actor.id}!${identifier}`)
			.digest("base64url");
		const value = `${trustToken}!${identifier}`;
		const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(value).digest("base64");
		const forged = `better-auth.trust_device=${encodeURIComponent(`${value}.${signature}`)}`;
		const unguardedControl = betterAuth({ ...auth.options, hooks: undefined });
		const control = await native(
			unguardedControl,
			"/sign-in/email",
			{ email: actor.email, password },
			forged,
		);
		expect(control.status).toBe(200);
		expect(((await control.json()) as { twoFactorRedirect?: boolean }).twoFactorRedirect).not.toBe(
			true,
		);
		// The control rotates its trusted record; use the freshly issued valid cookie for the protected request.
		const validTrustedCookie = cookies(control)
			.split("; ")
			.find((cookie) => cookie.startsWith("better-auth.trust_device="));
		expect(validTrustedCookie).toBeDefined();
		const pending = await challenge(actor, auth, validTrustedCookie?.replace("=", " = "));
		const verified = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret) },
			pending,
		);
		expect(verified.status).toBe(200);
		const cookie = cookies(verified, pending);
		expect((await request("/api/admin/users", "GET", undefined, cookie)).status).toBe(200);
		const [factor] = await db.select().from(twoFactor).where(eq(twoFactor.userId, actor.id));
		await db
			.update(twoFactor)
			.set({ secret: `${factor.secret}00` })
			.where(eq(twoFactor.id, factor.id));
		expect((await request("/api/admin/users", "GET", undefined, cookie)).status).toBe(403);
		await db.update(twoFactor).set({ secret: factor.secret }).where(eq(twoFactor.id, factor.id));
		expect((await request("/api/admin/users", "GET", undefined, cookie)).status).toBe(200);
		await db.delete(session).where(eq(session.userId, actor.id));
		expect((await request("/api/admin/users", "GET", undefined, cookie)).status).toBe(401);
		for (const path of ["/two-factor/send-otp", "/two-factor/verify-otp"])
			expect((await native(auth, path, { code: "123456" }, actor.cookie)).status).toBe(400);
		expect(
			(await native(auth, "/two-factor/enable", { password, method: "otp" }, actor.cookie)).status,
		).toBe(400);
	},
);

test.skipIf(!enabled)(
	"actual native TOTP and backup-code ciphertext needs retained legacy/versioned keys",
	async () => {
		const oldKey = "synthetic-old-rotation-key-at-least-32-characters";
		const nextKey = "synthetic-new-rotation-key-at-least-32-characters";
		const oldEngine = betterAuth({ ...auth.options, secret: oldKey, secrets: undefined });
		const changed = betterAuth({ ...auth.options, secret: nextKey, secrets: undefined });
		const rotating = betterAuth({
			...auth.options,
			secret: oldKey,
			secrets: [
				{ version: 2, value: nextKey },
				{ version: 1, value: oldKey },
			],
		});
		const legacy = await fixture("user", oldEngine);
		const legacySetup = await enroll(legacy, oldEngine);
		const [legacyFactor] = await db.select().from(twoFactor).where(eq(twoFactor.userId, legacy.id));
		expect(legacyFactor.secret.startsWith("$ba$")).toBe(false);
		for (const method of ["totp", "backup"] as const) {
			const pending = await challenge(legacy, changed);
			const response = await native(
				changed,
				method === "totp" ? "/two-factor/verify-totp" : "/two-factor/verify-backup-code",
				{ code: method === "totp" ? await code(legacySetup.secret) : legacySetup.backupCodes[0] },
				pending,
			);
			expect(response.status).toBe(500);
		}
		for (const method of ["totp", "backup"] as const) {
			const pending = await challenge(legacy, rotating);
			const response = await native(
				rotating,
				method === "totp" ? "/two-factor/verify-totp" : "/two-factor/verify-backup-code",
				{ code: method === "totp" ? await code(legacySetup.secret) : legacySetup.backupCodes[0] },
				pending,
			);
			expect(response.status).toBe(200);
		}
		const v1 = betterAuth({
			...auth.options,
			secret: oldKey,
			secrets: [{ version: 1, value: oldKey }],
		});
		const versioned = await fixture("user", v1);
		const versionedSetup = await enroll(versioned, v1);
		const [stored] = await db.select().from(twoFactor).where(eq(twoFactor.userId, versioned.id));
		expect(stored.secret.startsWith("$ba$1$")).toBe(true);
		expect(stored.backupCodes.startsWith("$ba$1$")).toBe(true);
		const retired = betterAuth({
			...auth.options,
			secret: oldKey,
			secrets: [{ version: 2, value: nextKey }],
		});
		for (const engine of [retired, rotating]) {
			for (const method of ["totp", "backup"] as const) {
				const pending = await challenge(versioned, engine);
				const response = await native(
					engine,
					method === "totp" ? "/two-factor/verify-totp" : "/two-factor/verify-backup-code",
					{
						code:
							method === "totp" ? await code(versionedSetup.secret) : versionedSetup.backupCodes[0],
					},
					pending,
				);
				expect(response.status).toBe(engine === retired ? 500 : 200);
			}
		}
	},
);

test.skipIf(!enabled)(
	"MFA denies every unenrolled staff role and forged proof; invalid and expired challenges never grant proof",
	async () => {
		for (const role of ["owner", "moderator", "support", "analyst"]) {
			const actor = await fixture(role);
			expect(
				(await request("/api/admin/me/permissions", "GET", undefined, actor.cookie)).status,
			).toBe(403);
		}
		const actor = await fixture("moderator");
		const setup = await enroll(actor);
		const pending = await challenge(actor);
		const correct = await code(setup.secret);
		const wrong = ((Number(correct) + 12345) % 1000000).toString().padStart(6, "0");
		expect(
			(
				await native(
					auth,
					"/two-factor/verify-totp",
					{ code: wrong, adminTotpFactor: "forged" },
					pending,
				)
			).status,
		).toBe(401);
		expect(
			(await db.select().from(session).where(eq(session.userId, actor.id))).every(
				(row) => !row.adminTotpFactor,
			),
		).toBe(true);
		const pendingB = await challenge(actor);
		const results = await Promise.all([
			native(auth, "/two-factor/verify-totp", { code: correct }, pendingB),
			native(auth, "/two-factor/verify-totp", { code: correct }, pendingB),
		]);
		expect(results.filter((response) => response.status === 200)).toHaveLength(1);
		const successful = results.find((response) => response.status === 200);
		if (!successful) throw new Error("Missing successful challenge");
		const cookie = cookies(successful, pendingB);
		expect((await request("/api/admin/me/permissions", "GET", undefined, cookie)).status).toBe(200);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, actor.cookie)).status,
		).toBe(403);
		const expired = await challenge(actor);
		await db
			.update(verification)
			.set({ expiresAt: new Date(Date.now() - 60000) })
			.where(eq(verification.value, actor.id));
		expect(
			(await native(auth, "/two-factor/verify-totp", { code: await code(setup.secret) }, expired))
				.status,
		).toBe(401);
		const current = (await db.select().from(session).where(eq(session.userId, actor.id))).find(
			(row) => row.adminTotpFactor,
		);
		if (!current) throw new Error("Missing proven session");
		await db
			.update(session)
			.set({ expiresAt: new Date(Date.now() - 60000) })
			.where(eq(session.id, current.id));
		expect((await request("/api/admin/me/permissions", "GET", undefined, cookie)).status).toBe(401);
	},
);

test.skipIf(!enabled)(
	"native password reset revokes TOTP proof without disabling the enrolled factor; factor FK cascades",
	async () => {
		const actor = await fixture("owner");
		const setup = await enroll(actor);
		const pending = await challenge(actor);
		const verified = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret) },
			pending,
		);
		expect(verified.status).toBe(200);
		const cookie = cookies(verified, pending);
		const token = crypto.randomUUID();
		const context = await auth.$context;
		await context.internalAdapter.createVerificationValue({
			identifier: `reset-password:${token}`,
			value: actor.id,
			expiresAt: new Date(Date.now() + 60000),
		});
		const reset = await native(auth, "/reset-password", {
			token,
			newPassword: "Replacement-test-password-123",
		});
		expect(reset.status).toBe(200);
		expect((await request("/api/admin/me/permissions", "GET", undefined, cookie)).status).toBe(401);
		expect(await db.select().from(session).where(eq(session.userId, actor.id))).toHaveLength(0);
		const [after] = await db.select().from(user).where(eq(user.id, actor.id));
		expect(after.twoFactorEnabled).toBe(true);
		const login = await native(auth, "/sign-in/email", {
			email: actor.email,
			password: "Replacement-test-password-123",
			adminTotpFactor: "forged",
		});
		expect(login.status).toBe(200);
		expect(((await login.json()) as { twoFactorRedirect: boolean }).twoFactorRedirect).toBe(true);
		expect(
			(await request("/api/admin/me/permissions", "GET", undefined, cookies(login))).status,
		).toBe(401);
		await db.delete(user).where(eq(user.id, actor.id));
		expect(await db.select().from(twoFactor).where(eq(twoFactor.userId, actor.id))).toHaveLength(0);
	},
);

test.skipIf(!enabled)(
	"native account-level TOTP lockout survives fresh challenges and never issues proof",
	async () => {
		const actor = await fixture("analyst");
		const setup = await enroll(actor);
		for (let attempt = 0; attempt < 10; attempt++) {
			const pending = await challenge(actor);
			const wrong = ((Number(await code(setup.secret)) + 12345) % 1000000)
				.toString()
				.padStart(6, "0");
			expect((await native(auth, "/two-factor/verify-totp", { code: wrong }, pending)).status).toBe(
				401,
			);
		}
		const [locked] = await db.select().from(twoFactor).where(eq(twoFactor.userId, actor.id));
		expect(locked.failedVerificationCount).toBe(10);
		expect(locked.lockedUntil && locked.lockedUntil > new Date()).toBe(true);
		const pending = await challenge(actor);
		expect(
			(await native(auth, "/two-factor/verify-totp", { code: await code(setup.secret) }, pending))
				.status,
		).toBe(429);
		expect(
			(await db.select().from(session).where(eq(session.userId, actor.id))).every(
				(row) => !row.adminTotpFactor,
			),
		).toBe(true);
		// Advance only the disposable fixture lock, avoiding a wall-clock sleep or a production setting change.
		await db
			.update(twoFactor)
			.set({ lockedUntil: new Date(Date.now() - 60000) })
			.where(eq(twoFactor.id, locked.id));
		const accepted = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret) },
			pending,
		);
		expect(accepted.status).toBe(200);
		const [reset] = await db.select().from(twoFactor).where(eq(twoFactor.id, locked.id));
		expect(reset.failedVerificationCount).toBe(0);
		expect(reset.lockedUntil).toBeNull();
	},
);

test.skipIf(!enabled)(
	"sensitive actions require this session's native TOTP proof and per-action operator password",
	async () => {
		const actor = await fixture("owner");
		const member = await fixture();
		const [targetSession] = await db.select().from(session).where(eq(session.userId, member.id));
		const siteResponse = await request(
			"/api/sites",
			"POST",
			{ slug: `mfa-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		);
		expect(siteResponse.status).toBe(200);
		const site = (await siteResponse.json()).result as { id: string };
		const paths = [
			`/api/admin/users/${member.id}/reveal-email`,
			`/api/admin/users/${member.id}/ban`,
			`/api/admin/users/${member.id}/unban`,
			`/api/admin/users/${member.id}/revoke-sessions`,
			`/api/admin/users/${member.id}/sessions/${targetSession.id}/revoke`,
			`/api/admin/sites/${site.id}/suspend`,
			`/api/admin/sites/${site.id}/resume`,
		];
		const data = { password, reason: "TOTP pipeline fixture" };
		for (const path of paths)
			expect((await request(path, "POST", data, actor.cookie)).status).toBe(403);
		const setup = await enroll(actor);
		for (const path of paths)
			expect((await request(path, "POST", data, actor.cookie)).status).toBe(403);
		await expect(
			auth.api.banUser({
				headers: new Headers({ Cookie: actor.cookie }),
				body: { ...data, userId: member.id },
			}),
		).rejects.toMatchObject({ body: { code: "ADMIN_MFA_REQUIRED" } });
		const pending = await challenge(actor);
		const verified = await native(
			auth,
			"/two-factor/verify-totp",
			{ code: await code(setup.secret) },
			pending,
		);
		expect(verified.status).toBe(200);
		const authenticated = cookies(verified, pending);
		const active = await auth.api.getSession({ headers: new Headers({ Cookie: authenticated }) });
		expect(active).toBeDefined();
		// Old creation time must not introduce an undocumented freshness gate.
		await db
			.update(session)
			.set({ createdAt: new Date(Date.now() - 86_400_000) })
			.where(eq(session.id, active?.session.id ?? "missing"));
		for (const path of paths) {
			await db.delete(rateBuckets).where(eq(rateBuckets.key, passwordFailures.key(actor.id)));
			const rejected = await request(
				path,
				"POST",
				{ ...data, password: "Wrong-operator-password" },
				authenticated,
			);
			expect(rejected.status).toBe(400);
		}
		for (const path of [paths[0], paths[4], paths[3], paths[1], paths[2], paths[5], paths[6]]) {
			const completed = await request(path, "POST", data, authenticated);
			expect(completed.status).toBe(200);
		}
		const events = await db.select().from(adminAudit).where(eq(adminAudit.actorId, actor.id));
		const attempts = events.filter((row) => row.status === "attempted");
		expect(attempts).toHaveLength(7);
		for (const attempt of attempts) {
			const correlated = events.filter((row) => row.requestId === attempt.requestId);
			expect(correlated.map((row) => row.status).sort()).toEqual(["attempted", "succeeded"]);
		}
		const removed = await request(
			`/api/admin/users/${member.id}/remove`,
			"POST",
			{ ...data, confirmation: member.id },
			authenticated,
		);
		expect(removed.status).toBe(200);
		await db.delete(session).where(eq(session.id, active?.session.id ?? "missing"));
		expect((await request(paths[0], "POST", data, authenticated)).status).toBe(401);
		await expect(
			auth.api.unbanUser({
				headers: new Headers({ Cookie: authenticated }),
				body: { ...data, userId: member.id },
			}),
		).rejects.toMatchObject({ statusCode: 401 });
	},
);

test.skipIf(!enabled)(
	"reports require session-bound TOTP for reads and handling while public intake stays anonymous",
	async () => {
		const member = await fixture();
		const created = await request(
			"/api/sites",
			"POST",
			{ slug: `mfa-report-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		);
		expect(created.status).toBe(200);
		const site = (await created.json()).result as { id: string };
		const { contentReports } = await import("../../src/db/schema/reports");
		const [report] = await db
			.insert(contentReports)
			.values({
				siteId: site.id,
				category: "other",
				message: "MFA report fixture",
				reporterIpHash: "f".repeat(64),
			})
			.returning();
		const paths = [
			"/api/admin/reports",
			`/api/admin/reports/${report.id}`,
			`/api/admin/reports/${report.id}/status`,
		];
		for (const role of ["owner", "moderator", "support", "analyst"]) {
			const actor = await fixture(role);
			for (const path of paths)
				expect(
					(
						await request(
							path,
							path.endsWith("status") ? "POST" : "GET",
							path.endsWith("status") ? { status: "reviewing" } : undefined,
							actor.cookie,
						)
					).status,
				).toBe(403);
		}
		const actor = await fixture("moderator"),
			setup = await enroll(actor);
		const pending = await challenge(actor),
			verified = await native(
				auth,
				"/two-factor/verify-totp",
				{ code: await code(setup.secret) },
				pending,
			);
		expect(verified.status).toBe(200);
		const cookie = cookies(verified, pending);
		for (const path of paths.slice(0, 2))
			expect((await request(path, "GET", undefined, cookie)).status).toBe(200);
		expect((await request(paths[2], "POST", { status: "reviewing" }, cookie)).status).toBe(200);
		expect(
			(
				await request(
					paths[2],
					"POST",
					{ status: "dismissed", resolutionNote: "Reviewed native TOTP report" },
					cookie,
				)
			).status,
		).toBe(200);
		await db.delete(session).where(eq(session.userId, actor.id));
		expect((await request(paths[2], "POST", { status: "reviewing" }, cookie)).status).toBe(401);
	},
);
