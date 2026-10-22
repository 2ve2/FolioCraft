import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { eq, inArray } from "drizzle-orm";
import { db, withRequestDatabase } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { session, user } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { sites } from "../src/db/schema/site";
import { auth } from "../src/lib/auth";
import { authHooks } from "../src/lib/auth/hooks";
import * as auditWriter from "../src/services/admin/audit-service";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];
afterAll(async () => {
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
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
			JSON.stringify({
				event: "sensitive_fixture_cleanup",
				usersRemaining: 0,
				actorAuditRemaining: 0,
			}),
		);
	}
});

/** Assigns roles only to this suite's newly created disposable local identities. */
async function fixture(role = "user") {
	const actor = await account("sensitive", ids);
	if (role !== "user") await db.update(user).set({ role }).where(eq(user.id, actor.id));
	return {
		...actor,
		headers: new Headers({ Cookie: actor.cookie, Origin: "http://localhost:3000" }),
	};
}

/** Reads the actual durable event stream without relying on incidental whole-table counts. */
async function audit(actorId: string) {
	return db.select().from(adminAudit).where(eq(adminAudit.actorId, actorId));
}

/** Proves two distinct append-only rows correlate on every security-relevant identity. */
function pair(
	rows: Awaited<ReturnType<typeof audit>>,
	targetId: string,
	action: string,
	status: "failed" | "succeeded" = "succeeded",
) {
	const events = rows.filter((row) => row.action === action && row.targetId === targetId);
	expect(events).toHaveLength(2);
	expect(new Set(events.map((row) => row.id)).size).toBe(2);
	expect(new Set(events.map((row) => row.requestId)).size).toBe(1);
	const expected: ("attempted" | "succeeded" | "failed")[] = ["attempted", status];
	expect(events.map((row) => row.status).sort()).toEqual(expected.sort());
	expect(events[0].reason).toBe(events[1].reason);
	expect(events[0].actorId).toBe(events[1].actorId);
	expect(events[0].targetType).toBe(events[1].targetType);
}

test("ordinary ban/unban and one/all session revocation execute natively with correlated audits", async () => {
	const actor = await fixture("support");
	const member = await fixture();
	const credentials = { reason: "  Reviewed ordinary account  ", password: actor.password };
	const base = `/api/admin/users/${member.id}`;
	const [first] = await db.select().from(session).where(eq(session.userId, member.id));
	// Browser IDs resolve server-side; presenting another user's ID or an actual token cannot revoke it.
	const [actorSession] = await db.select().from(session).where(eq(session.userId, actor.id));
	for (const id of [actorSession.id, first.token])
		await error(
			await request(`${base}/sessions/${id}/revoke`, "POST", credentials, actor.cookie),
			404,
		);
	await result(
		await request(`${base}/sessions/${first.id}/revoke`, "POST", credentials, actor.cookie),
	);
	expect(await db.select().from(session).where(eq(session.id, first.id))).toHaveLength(0);
	pair(await audit(actor.id), first.id, "user.revoke_session");
	await result(
		await request(`${base}/ban`, "POST", { ...credentials, banExpiresIn: 60 }, actor.cookie),
	);
	const [banned] = await db.select().from(user).where(eq(user.id, member.id));
	expect(banned.banned).toBe(true);
	expect(banned.banReason).toBe("Reviewed ordinary account");
	expect(banned.banExpires?.getTime()).toBeGreaterThan(Date.now());
	await error(
		await request(
			"/api/auth/sign-in/email",
			"POST",
			{
				email: member.email,
				password: member.password,
			},
			undefined,
			`127.91.${Math.floor(Math.random() * 254)}.1`,
		),
		403,
	);
	await result(await request(`${base}/unban`, "POST", credentials, actor.cookie));
	expect((await db.select().from(user).where(eq(user.id, member.id)))[0].banned).toBe(false);
	const signedIn = await request(
		"/api/auth/sign-in/email",
		"POST",
		{
			email: member.email,
			password: member.password,
		},
		undefined,
		`127.92.${Math.floor(Math.random() * 254)}.1`,
	);
	expect(signedIn.status).toBe(200);
	expect(
		(await db.select().from(session).where(eq(session.userId, member.id))).length,
	).toBeGreaterThan(0);
	await result(await request(`${base}/revoke-sessions`, "POST", credentials, actor.cookie));
	expect(await db.select().from(session).where(eq(session.userId, member.id))).toHaveLength(0);
	const events = await audit(actor.id);
	for (const action of ["user.ban", "user.unban", "user.revoke_sessions"])
		pair(events, member.id, action);
	const serialized = JSON.stringify(events);
	for (const secret of [actor.password, member.password, first.token, actor.cookie, member.email])
		expect(serialized).not.toContain(secret);
	expect(
		events
			.filter((row) => row.action !== "permission_denied")
			.every((row) => row.reason === credentials.reason.trim()),
	).toBe(true);
});

test("all four account operations reject credentials, reason bounds, extra fields and protected targets", async () => {
	const actor = await fixture("owner");
	const member = await fixture();
	const [stored] = await db.select().from(session).where(eq(session.userId, member.id));
	const paths = ["ban", "unban", "revoke-sessions", `sessions/${stored.id}/revoke`];
	for (const path of paths) {
		for (const body of [
			{ reason: "Reviewed account" },
			{ reason: "Reviewed account", password: "" },
			{ reason: "Reviewed account", password: member.password },
			{ reason: "123456789", password: actor.password },
			{ reason: "x".repeat(501), password: actor.password },
			{ reason: "   ", password: actor.password },
			{ reason: "Reviewed account", password: actor.password, sessionToken: stored.token },
		])
			await error(
				await request(`/api/admin/users/${member.id}/${path}`, "POST", body, actor.cookie),
				400,
			);
	}
	expect((await audit(actor.id)).every((row) => row.action === "permission_denied")).toBe(true);
	expect((await db.select().from(user).where(eq(user.id, member.id)))[0].banned).toBe(false);
	expect(await db.select().from(session).where(eq(session.id, stored.id))).toHaveLength(1);
	for (const role of [
		"owner",
		"moderator",
		"support",
		"analyst",
		"user,support",
		"user,unknown",
		"admin",
		"unknown",
		"",
	]) {
		const protectedUser = await fixture(role);
		const [targetSession] = await db
			.select()
			.from(session)
			.where(eq(session.userId, protectedUser.id));
		for (const path of ["ban", "unban", "revoke-sessions", `sessions/${targetSession.id}/revoke`]) {
			await error(
				await request(
					`/api/admin/users/${protectedUser.id}/${path}`,
					"POST",
					{ reason: "Protected target policy", password: actor.password },
					actor.cookie,
				),
				503,
				"ADMIN_ACTION_UNAVAILABLE",
			);
		}
	}
});

test("native hooks strip extensions, reject bypasses and audit native failure without replacing attempts", async () => {
	const actor = await fixture("owner");
	const member = await fixture();
	const body = { userId: member.id, reason: "Native reviewed reason", password: actor.password };
	await expect(
		auth.api.banUser({ headers: actor.headers, body: { userId: member.id } }),
	).rejects.toMatchObject({ body: { code: "VALIDATION_ERROR" } });
	for (const operation of [
		() => auth.api.setRole({ headers: actor.headers, body: { userId: member.id, role: "owner" } }),
		() => auth.api.removeUser({ headers: actor.headers, body: { userId: member.id } }),
		() =>
			auth.api.createUser({
				headers: actor.headers,
				body: { name: "Closed", email: "closed@example.com", password: "Never-applied-123" },
			}),
	])
		await expect(operation()).rejects.toBeDefined();
	const seen: string[][] = [];
	const probe = betterAuth({
		...auth.options,
		hooks: {
			before: authHooks.before,
			after: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/admin/ban-user") seen.push(Object.keys(ctx.body).sort());
				return authHooks.after(ctx);
			}),
		},
	});
	await probe.api.banUser({ headers: actor.headers, body });
	expect(seen).toEqual([["banReason", "userId"]]);
	pair(await audit(actor.id), member.id, "user.ban");
	const doomed = await fixture();
	const failureProbe = betterAuth({
		...auth.options,
		plugins: [
			...(auth.options.plugins ?? []),
			{
				id: "disposable-native-failure-fixture",
				hooks: {
					before: [
						{
							matcher: (ctx) => ctx.path === "/admin/unban-user",
							handler: createAuthMiddleware(async () => {
								const attempted = (await audit(actor.id)).filter(
									(row) => row.action === "user.unban" && row.targetId === doomed.id,
								);
								expect(attempted.map((row) => row.status)).toEqual(["attempted"]);
								await db.delete(user).where(eq(user.id, doomed.id));
							}),
						},
					],
				},
			},
		],
	});
	await expect(
		failureProbe.api.unbanUser({
			headers: actor.headers,
			body: {
				...{ userId: doomed.id, reason: "Native failure fixture", password: actor.password },
			},
		}),
	).rejects.toMatchObject({ statusCode: 404 });
	pair(await audit(actor.id), doomed.id, "user.unban", "failed");
});

test("attempt insertion failure blocks mutation; outcome failure reports indeterminate after native completion", async () => {
	const actor = await fixture("owner");
	const member = await fixture();
	const original = auditWriter.recordAdminAction;
	let failStatus = "attempted";
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
		if (args[3] === "user" && args[4] === member.id && args[1].status === failStatus)
			throw new Error("Synthetic audit write failure");
		return original(...args);
	});
	try {
		const call = () =>
			request(
				`/api/admin/users/${member.id}/ban`,
				"POST",
				{ reason: "Audit durability fixture", password: actor.password },
				actor.cookie,
			);
		await error(await call(), 503, "ADMIN_AUDIT_UNAVAILABLE");
		expect((await db.select().from(user).where(eq(user.id, member.id)))[0].banned).toBe(false);
		expect((await audit(actor.id)).filter((row) => row.action === "user.ban")).toHaveLength(0);
		failStatus = "succeeded";
		await error(await call(), 503, "ADMIN_ACTION_INDETERMINATE");
		expect((await db.select().from(user).where(eq(user.id, member.id)))[0].banned).toBe(true);
		const events = (await audit(actor.id)).filter((row) => row.action === "user.ban");
		expect(events).toHaveLength(1);
		expect(events[0].status).toBe("attempted");
	} finally {
		writer.mockRestore();
	}
});

test("permission_denied flood remains denied with ten writes per actor/action including parallel native calls", async () => {
	const actor = await fixture("analyst");
	const member = await fixture();
	const body = { reason: "Denied flood fixture", password: actor.password };
	const responses = await Promise.all(
		Array.from({ length: 24 }, () =>
			request(`/api/admin/users/${member.id}/ban`, "POST", body, actor.cookie),
		),
	);
	expect(responses.every((response) => response.status === 403)).toBe(true);
	await Promise.all(
		Array.from({ length: 24 }, async () => {
			await expect(
				auth.api.unbanUser({ headers: actor.headers, body: { ...body, userId: member.id } }),
			).rejects.toMatchObject({ statusCode: 403 });
		}),
	);
	for (const action of ["user.ban", "user.unban"]) {
		const events = (await audit(actor.id)).filter(
			(row) => row.action === "permission_denied" && row.metadata.action === action,
		);
		expect(events).toHaveLength(10);
		expect(
			events.every(
				(row) =>
					row.status === "failed" &&
					row.reason === null &&
					Object.keys(row.metadata).sort().join() === "action,code",
			),
		).toBe(true);
	}
	const key = createHash("sha256").update(`admin-denial:${actor.id}:user.ban`).digest("hex");
	const [bucket] = await db.select().from(rateBuckets).where(eq(rateBuckets.key, key));
	expect(bucket.count).toBe(11);
	await db
		.update(rateBuckets)
		.set({ expiresAt: new Date(Date.now() - 1000) })
		.where(eq(rateBuckets.key, key));
	await error(await request(`/api/admin/users/${member.id}/ban`, "POST", body, actor.cookie), 403);
	expect((await audit(actor.id)).filter((row) => row.metadata.action === "user.ban")).toHaveLength(
		11,
	);
	const other = await fixture("analyst");
	await error(await request(`/api/admin/users/${member.id}/ban`, "POST", body, other.cookie), 403);
	expect(await audit(other.id)).toHaveLength(1);
});

test("site moderation requires operator credentials and rejects staff-owned sites with no mutation attempt", async () => {
	const actor = await fixture("moderator");
	const member = await fixture();
	const ordinary = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `sensitive-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const protectedSite = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `sensitive-${crypto.randomUUID()}`, locale: "en" },
			actor.cookie,
		),
	);
	for (const operation of ["suspend", "resume"]) {
		for (const body of [
			{ reason: "Site moderation fixture" },
			{ reason: "Site moderation fixture", password: member.password },
			{ reason: "short", password: actor.password },
		])
			await error(
				await request(`/api/admin/sites/${ordinary.id}/${operation}`, "POST", body, actor.cookie),
				400,
			);
		await error(
			await request(
				`/api/admin/sites/${protectedSite.id}/${operation}`,
				"POST",
				{ reason: "Protected site fixture", password: actor.password },
				actor.cookie,
			),
			503,
			"ADMIN_ACTION_UNAVAILABLE",
		);
	}
	expect((await audit(actor.id)).every((row) => row.action === "permission_denied")).toBe(true);
});

test("parallel sensitive invocations isolate correlation, target and trimmed boundary reasons", async () => {
	const actor = await fixture("owner");
	const first = await fixture();
	const second = await fixture();
	const results = await Promise.all([
		request(
			`/api/admin/users/${first.id}/ban`,
			"POST",
			{ password: actor.password, reason: "  1234567890  " },
			actor.cookie,
		),
		request(
			`/api/admin/users/${second.id}/ban`,
			"POST",
			{ password: actor.password, reason: `  ${"x".repeat(500)}  ` },
			actor.cookie,
		),
	]);
	expect(results.map((response) => response.status)).toEqual([200, 200]);
	const events = (await audit(actor.id)).filter((row) => row.action === "user.ban");
	pair(events, first.id, "user.ban");
	pair(events, second.id, "user.ban");
	expect(new Set(events.map((row) => row.requestId)).size).toBe(2);
	for (const row of events) expect(row.reason?.length).toBe(row.targetId === first.id ? 10 : 500);
});

test("site outcome failure rolls state back and moderation uses the request-owned single connection", async () => {
	const actor = await fixture("moderator");
	const member = await fixture();
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `rollback-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const original = auditWriter.recordAdminAction;
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
		if (args[3] === "site" && args[4] === site.id && args[1].status === "succeeded")
			throw new Error("Synthetic transactional outcome failure");
		return original(...args);
	});
	const moderate = () =>
		withRequestDatabase(() =>
			request(
				`/api/admin/sites/${site.id}/suspend`,
				"POST",
				{ reason: "Transactional audit fixture", password: actor.password },
				actor.cookie,
			),
		);
	try {
		await error(await moderate(), 500);
	} finally {
		writer.mockRestore();
	}
	expect((await db.select().from(sites).where(eq(sites.id, site.id)))[0].suspended).toBe(false);
	pair(await audit(actor.id), site.id, "site.suspend", "failed");
	await result(await moderate());
	expect((await db.select().from(sites).where(eq(sites.id, site.id)))[0].suspended).toBe(true);
	const events = (await audit(actor.id)).filter((row) => row.targetId === site.id);
	expect(events).toHaveLength(4);
	expect(events.filter((row) => row.status === "attempted")).toHaveLength(2);
	expect(events.filter((row) => row.status === "succeeded")).toHaveLength(1);
});

test("ordinary accounts cannot write administrative denial rows", async () => {
	const member = await fixture();
	const target = await fixture();
	for (let i = 0; i < 3; i++)
		await error(
			await request(
				`/api/admin/users/${target.id}/ban`,
				"POST",
				{ reason: "Not staff at all", password: member.password },
				member.cookie,
			),
			403,
		);
	expect(await audit(member.id)).toHaveLength(0);
});
