import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { session, user } from "../src/db/schema/auth";
import { requireAdmin } from "../src/middleware/admin";
import type { AuthEnv } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/error-handler";
import { error, request } from "./helpers";

const createdUsers: string[] = [];

/** Keeps only the latest value of each native cookie, including impersonation restoration cookies. */
function cookies(response: Response) {
	const values = new Map<string, string>();
	for (const header of response.headers.getSetCookie()) {
		const value = header.split(";")[0];
		values.set(value.split("=")[0], value);
	}
	return [...values.values()].join("; ");
}

/** Creates isolated native auth fixtures while attempting forbidden signup privilege fields. */
async function fixture(label: string) {
	const nonce = crypto.randomUUID();
	const email = `folio-admin-${label}-${nonce}@example.com`;
	const password = `Portfolio-${nonce}`;
	const bytes = crypto.getRandomValues(new Uint8Array(3));
	const clientIp = `127.${bytes[0]}.${bytes[1]}.${bytes[2]}`;
	const escalation = await request(
		"/api/auth/sign-up/email",
		"POST",
		{
			name: label,
			email,
			password,
			role: "admin",
			banned: false,
			emailVerified: true,
		},
		undefined,
		clientIp,
	);
	expect(escalation.status).toBe(400);
	const response = await request(
		"/api/auth/sign-up/email",
		"POST",
		{ name: label, email, password },
		undefined,
		clientIp,
	);
	expect(response.status).toBe(200);
	const body = (await response.json()) as {
		user: { id: string; role: string; emailVerified: boolean };
	};
	createdUsers.push(body.user.id);
	expect(body.user.role).toBe("user");
	expect(body.user.emailVerified).toBe(false);
	return { id: body.user.id, email, password, cookie: cookies(response), clientIp };
}

/** Removes only fixtures and audit rows produced by this isolated test. */
afterAll(async () => {
	if (createdUsers.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, createdUsers));
		await db.delete(user).where(inArray(user.id, createdUsers));
	}
});

/** Verifies native privilege boundaries and audit attribution against isolated real PostgreSQL. */
test("native admin authorization, bans, revocation, impersonation and sanitized auditing", async () => {
	const administrator = await fixture("administrator");
	const member = await fixture("member");
	const target = await fixture("target");
	expect((await request("/api/auth/admin/list-users")).status).toBe(401);
	await error(
		await request("/api/auth/admin/list-users", "GET", undefined, member.cookie),
		403,
		"ADMIN_REQUIRED",
	);
	await error(
		await request(
			"/api/auth/admin/set-role",
			"POST",
			{ userId: member.id, role: "admin" },
			member.cookie,
		),
		403,
	);
	const [unchanged] = await db.select().from(user).where(eq(user.id, member.id));
	expect(unchanged.role).toBe("user");

	// Only this generated isolated fixture is bootstrapped; no development or Neon account is touched.
	await db.update(user).set({ role: "admin" }).where(eq(user.id, administrator.id));
	expect(
		(await request("/api/auth/admin/list-users?limit=10", "GET", undefined, administrator.cookie))
			.status,
	).toBe(200);
	const promoted = await request(
		"/api/auth/admin/set-role",
		"POST",
		{ userId: member.id, role: "admin" },
		administrator.cookie,
	);
	expect(promoted.status).toBe(200);
	const demoted = await request(
		"/api/auth/admin/set-role",
		"POST",
		{ userId: member.id, role: "user" },
		administrator.cookie,
	);
	expect(demoted.status).toBe(200);
	await error(
		await request(
			"/api/auth/admin/ban-user",
			"POST",
			{ userId: administrator.id },
			administrator.cookie,
		),
		400,
	);

	const ban = await request(
		"/api/auth/admin/ban-user",
		"POST",
		{ userId: member.id, banReason: "Fixture moderation private reason" },
		administrator.cookie,
	);
	expect(ban.status).toBe(200);
	const [banned] = await db.select().from(user).where(eq(user.id, member.id));
	expect(banned.banned).toBe(true);
	expect(await db.select().from(session).where(eq(session.userId, member.id))).toHaveLength(0);
	await error(await request("/api/me", "GET", undefined, member.cookie), 401);
	await error(
		await request(
			"/api/auth/sign-in/email",
			"POST",
			{
				email: member.email,
				password: member.password,
			},
			undefined,
			member.clientIp,
		),
		403,
		"BANNED_USER",
	);
	expect(
		(
			await request(
				"/api/auth/admin/unban-user",
				"POST",
				{ userId: member.id },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	const login = await request(
		"/api/auth/sign-in/email",
		"POST",
		{
			email: member.email,
			password: member.password,
		},
		undefined,
		member.clientIp,
	);
	expect(login.status).toBe(200);
	const memberCookie = cookies(login);
	expect((await request("/api/me", "GET", undefined, memberCookie)).status).toBe(200);
	expect(
		(
			await request(
				"/api/auth/admin/revoke-user-sessions",
				"POST",
				{ userId: member.id },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	await error(await request("/api/me", "GET", undefined, memberCookie), 401);

	const impersonation = await request(
		"/api/auth/admin/impersonate-user",
		"POST",
		{ userId: target.id },
		administrator.cookie,
	);
	expect(impersonation.status).toBe(200);
	const impersonatedCookie = cookies(impersonation);
	// A later role change must never turn an impersonated identity into a platform administrator.
	expect(
		(
			await request(
				"/api/auth/admin/set-role",
				"POST",
				{ userId: target.id, role: "admin" },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	await error(
		await request("/api/auth/admin/list-users", "GET", undefined, impersonatedCookie),
		403,
		"IMPERSONATION_RESTRICTED",
	);
	await error(
		await request(
			"/api/auth/admin/set-role",
			"POST",
			{ userId: member.id, role: "admin" },
			impersonatedCookie,
		),
		403,
		"IMPERSONATION_RESTRICTED",
	);
	const probe = new Hono<AuthEnv>();
	probe.get("/", requireAdmin, (c) => c.json({ ok: true }));
	probe.onError(errorHandler);
	expect(
		(await probe.request("http://localhost/", { headers: { Cookie: impersonatedCookie } })).status,
	).toBe(403);
	expect(
		(await probe.request("http://localhost/", { headers: { Cookie: administrator.cookie } }))
			.status,
	).toBe(200);
	const stop = await request("/api/auth/admin/stop-impersonating", "POST", {}, impersonatedCookie);
	expect(stop.status).toBe(200);
	expect(
		(await request("/api/auth/admin/list-users", "GET", undefined, cookies(stop))).status,
	).toBe(200);

	const events = await db.select().from(adminAudit).where(eq(adminAudit.actorId, administrator.id));
	expect(events.filter((event) => event.status === "succeeded")).toHaveLength(8);
	expect(events.filter((event) => event.status === "failed")).toHaveLength(1);
	expect(events.some((event) => event.status === "attempted")).toBe(false);
	expect(
		events.find((event) => event.action === "auth.ban-user" && event.status === "succeeded")
			?.targetId,
	).toBe(member.id);
	expect(events.find((event) => event.action === "auth.impersonate-user")?.actorId).toBe(
		administrator.id,
	);
	expect(events.find((event) => event.action === "auth.stop-impersonating")?.actorId).toBe(
		administrator.id,
	);
	const serialized = JSON.stringify(events);
	for (const secret of [
		administrator.password,
		member.email,
		member.password,
		"Fixture moderation private reason",
		administrator.cookie,
		impersonatedCookie,
	])
		expect(serialized).not.toContain(secret);
	for (const event of events) {
		expect(event.reason).toBeNull();
		expect(event.metadata).toEqual({});
	}
	// Defense in depth also rejects a preexisting session if moderation flags change externally.
	await db.update(user).set({ banned: true, banExpires: null }).where(eq(user.id, target.id));
	await error(await request("/api/me", "GET", undefined, target.cookie), 403, "ACCOUNT_BANNED");
	await db
		.update(user)
		.set({ banExpires: new Date(Date.now() - 1000) })
		.where(eq(user.id, target.id));
	expect((await request("/api/me", "GET", undefined, target.cookie)).status).toBe(200);
});

/** Exercises the remaining native mutation hooks with generated, removable auth fixtures. */
test("native created-user, password, update, single-session and deletion audit IDs", async () => {
	const administrator = await fixture("mutation-admin");
	await db.update(user).set({ role: "admin" }).where(eq(user.id, administrator.id));
	const email = `folio-native-${crypto.randomUUID()}@example.com`;
	const password = `Initial-${crypto.randomUUID()}`;
	const newPassword = `Changed-${crypto.randomUUID()}`;
	const created = await request(
		"/api/auth/admin/create-user",
		"POST",
		{ name: "Native fixture", email, password },
		administrator.cookie,
	);
	expect(created.status).toBe(200);
	const createdBody = (await created.json()) as { user: { id: string } };
	const targetId = createdBody.user.id;
	createdUsers.push(targetId);
	expect(
		(
			await request(
				"/api/auth/admin/update-user",
				"POST",
				{ userId: targetId, data: { name: "Updated private fixture name" } },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	expect(
		(
			await request(
				"/api/auth/admin/set-user-password",
				"POST",
				{ userId: targetId, newPassword },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	const login = await request(
		"/api/auth/sign-in/email",
		"POST",
		{ email, password: newPassword },
		undefined,
		administrator.clientIp,
	);
	expect(login.status).toBe(200);
	const [targetSession] = await db.select().from(session).where(eq(session.userId, targetId));
	expect(targetSession).toBeDefined();
	expect(
		(
			await request(
				"/api/auth/admin/revoke-user-session",
				"POST",
				{ sessionToken: targetSession.token },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	await error(await request("/api/me", "GET", undefined, cookies(login)), 401);
	expect(
		(
			await request(
				"/api/auth/admin/remove-user",
				"POST",
				{ userId: targetId },
				administrator.cookie,
			)
		).status,
	).toBe(200);
	expect(await db.select().from(user).where(eq(user.id, targetId))).toHaveLength(0);
	const events = await db.select().from(adminAudit).where(eq(adminAudit.actorId, administrator.id));
	expect(events).toHaveLength(5);
	expect(events.every((event) => event.status === "succeeded")).toBe(true);
	expect(events.find((event) => event.action === "auth.create-user")?.targetId).toBe(targetId);
	expect(events.find((event) => event.action === "auth.revoke-user-session")?.targetId).toBe(
		targetSession.id,
	);
	expect(events.find((event) => event.action === "auth.revoke-user-session")?.targetType).toBe(
		"session",
	);
	expect(events.find((event) => event.action === "auth.remove-user")?.targetId).toBe(targetId);
	const serialized = JSON.stringify(events);
	for (const value of [
		email,
		password,
		newPassword,
		targetSession.token,
		"Updated private fixture name",
	])
		expect(serialized).not.toContain(value);
});
