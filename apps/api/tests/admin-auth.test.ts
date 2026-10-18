import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { hasPermission, permissionsFor, rolePermissions } from "@ichnara/contracts/admin-policy";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import app from "../src/app";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { session, user } from "../src/db/schema/auth";
import { sites } from "../src/db/schema/site";
import { auth } from "../src/lib/auth";
import { accessRoles } from "../src/lib/auth/access";
import { authHooks } from "../src/lib/auth/hooks";
import { declaredPermission, requireAdmin, requirePermission } from "../src/middleware/admin";
import type { AuthEnv } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/error-handler";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];
afterAll(async () => {
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(user).where(inArray(user.id, ids));
	}
});

/** Grants roles only to freshly created, removable local test fixtures. */
async function fixture(role: string) {
	const actor = await account(`rbac-${role.replace(/,/g, "-")}`, ids);
	await db.update(user).set({ role }).where(eq(user.id, actor.id));
	return {
		...actor,
		headers: new Headers({ Cookie: actor.cookie, Origin: "http://localhost:3000" }),
	};
}

/** Extracts declarations from the actual mounted router, grouping handlers of each endpoint. */
function endpointDeclarations() {
	const endpoints = new Map<string, string[]>();
	for (const route of app.routes) {
		if (!route.path.startsWith("/api/admin/") || route.handler === requireAdmin) continue;
		const key = `${route.method} ${route.path}`;
		const permissions = endpoints.get(key) ?? [];
		const permission = declaredPermission(route.handler);
		if (permission) permissions.push(permission);
		endpoints.set(key, permissions);
	}
	return endpoints;
}

test("actual mounted admin endpoints declare permissions and unregistered routes fail closed", async () => {
	const endpoints = endpointDeclarations();
	expect(endpoints.size).toBe(10);
	for (const permissions of endpoints.values()) expect(permissions.length).toBeGreaterThan(0);
	const owner = await fixture("owner");
	const wildcardProbe = new Hono<AuthEnv>();
	wildcardProbe.use("/api/admin/*", requireAdmin);
	wildcardProbe.all("/api/admin/*", (c) => c.json({ leaked: true }));
	wildcardProbe.get("/api/admin/declared", requirePermission("site", "read"), (c) =>
		c.json({ ok: true }),
	);
	wildcardProbe.onError(errorHandler);
	expect(
		(await wildcardProbe.request("http://localhost/api/admin/declared", { headers: owner.headers }))
			.status,
	).toBe(403);
	const probe = new Hono<AuthEnv>();
	probe.use("/api/admin/*", requireAdmin);
	probe.get("/api/admin/forgotten", (c) => c.json({ leaked: true }));
	// Even a declared dynamic route must not authorize an overlapping undeclared endpoint.
	probe.get("/api/admin/:id", requirePermission("site", "read"), (c) => c.json({ ok: true }));
	probe.all("/api/admin/all-methods", (c) => c.json({ leaked: true }));
	probe.onError(errorHandler);
	for (const method of ["GET", "POST", "PATCH", "DELETE", "HEAD"]) {
		const response = await probe.request("http://localhost/api/admin/forgotten", {
			method,
			headers: owner.headers,
		});
		expect(response.status).toBe(403);
	}
	expect(
		(await probe.request("http://localhost/api/admin/all-methods", { headers: owner.headers }))
			.status,
	).toBe(403);
	expect((await request("/api/admin/unknown", "GET", undefined, owner.cookie)).status).toBe(403);
});

test("every role against every live admin endpoint follows independent expected grants", async () => {
	const member = await fixture("user");
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `rbac-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const endpoint = [
		["GET", "/sites", "site.read"],
		["GET", `/sites/${site.id}`, "site.read"],
		["POST", `/sites/${site.id}/suspend`, "site.suspend"],
		["POST", `/sites/${site.id}/resume`, "site.resume"],
		["GET", "/resources", "system.read"],
		["GET", "/audit", "audit.read"],
		["GET", "/me/permissions", "user.read"],
		["GET", "/users", "user.read"],
		["GET", `/users/${member.id}`, "user.read"],
		["GET", `/users/${member.id}/sessions`, "user.read"],
	] as const;
	const expected: Record<string, readonly string[]> = {
		owner: ["site.read", "site.suspend", "site.resume", "system.read", "audit.read", "user.read"],
		moderator: ["site.read", "site.suspend", "site.resume", "audit.read", "user.read"],
		support: ["site.read", "user.read"],
		analyst: ["site.read", "system.read", "audit.read", "user.read"],
		"support,moderator": ["site.read", "site.suspend", "site.resume", "audit.read", "user.read"],
		user: [],
		admin: [],
		unknown: [],
	};
	expect(endpointDeclarations().size).toBe(endpoint.length);
	for (const [role, permissions] of Object.entries(expected)) {
		const actor = role === "user" ? member : await fixture(role);
		for (const [method, path, permission] of endpoint) {
			if (method === "POST")
				await db
					.update(sites)
					.set({ suspended: path.endsWith("/resume") })
					.where(eq(sites.id, site.id));
			const response = await request(
				`/api/admin${path}`,
				method,
				method === "POST" ? { reason: "Fixture policy verification" } : undefined,
				actor.cookie,
			);
			expect(response.status, `${role} ${method} ${path}`).toBe(
				permissions.includes(permission) ? 200 : 403,
			);
			if (method === "GET")
				expect((await request(`/api/admin${path}`, "HEAD", undefined, actor.cookie)).status).toBe(
					permissions.includes(permission) ? 200 : 403,
				);
		}
	}
	for (const [method, path] of endpoint)
		expect(
			(
				await request(
					`/api/admin${path}`,
					method,
					method === "POST" ? { reason: "Fixture reason" } : undefined,
				)
			).status,
		).toBe(401);
});

test("native external HTTP is intercepted while internal calls execute authoritative hooks", async () => {
	const owner = await fixture("owner");
	const member = await fixture("user");
	// Probe the installed before/after lifecycle without adding test observability to production code.
	const afterPaths: string[] = [];
	const lifecycleProbe = betterAuth({
		...auth.options,
		hooks: {
			before: authHooks.before,
			after: createAuthMiddleware(async (context) => {
				afterPaths.push(context.path);
			}),
		},
	});
	await lifecycleProbe.api.listUsers({ headers: owner.headers, query: { limit: 1 } });
	expect(afterPaths).toEqual(["/admin/list-users"]);
	const internal = await auth.api.listUsers({ headers: owner.headers, query: { limit: 1 } });
	expect(internal.users.length).toBe(1);
	// This code belongs to the project before hook, not the native permission plugin.
	const [row] = await db.select().from(session).where(eq(session.userId, owner.id));
	await db.update(session).set({ impersonatedBy: member.id }).where(eq(session.id, row.id));
	await expect(
		auth.api.listUsers({ headers: owner.headers, query: { limit: 1 } }),
	).rejects.toMatchObject({ body: { code: "IMPERSONATION_RESTRICTED" } });
	expect((await request("/api/admin/users", "GET", undefined, owner.cookie)).status).toBe(403);
	await db.update(session).set({ impersonatedBy: null }).where(eq(session.id, row.id));
	await db.update(user).set({ banned: true }).where(eq(user.id, owner.id));
	await expect(
		auth.api.listUsers({ headers: owner.headers, query: { limit: 1 } }),
	).rejects.toMatchObject({ body: { code: "ACCOUNT_BANNED" } });
	await db.update(user).set({ banned: false, role: "user" }).where(eq(user.id, owner.id));
	await expect(
		auth.api.listUsers({ headers: owner.headers, query: { limit: 1 } }),
	).rejects.toMatchObject({ body: { code: "ADMIN_REQUIRED" } });
	for (const path of [
		"/api/auth/admin/list-users",
		"/api/auth/admin/set-role",
		"/api/auth/admin/",
		"/api/auth/%61dmin/list-users",
		"/api/auth/admin%2flist-users",
		"/api/auth//admin/list-users",
		"/api/auth/admin/../admin/list-users",
	]) {
		for (const method of ["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
			const response = await app.request(`http://localhost:4000${path}`, {
				method,
				headers: {
					Cookie: owner.cookie,
					Origin: "http://localhost:3000",
					"x-admin-internal": "true",
				},
			});
			expect(response.status, `${method} ${path}`).toBe(403);
			expect(response.headers.get("Cache-Control")).toBe("no-store");
			if (method !== "HEAD")
				expect((await response.json()).code).toBe("NATIVE_ADMIN_HTTP_DISABLED");
		}
	}
});

test("all identities are masked, session DTOs exclude secrets and reason bounds apply on the server", async () => {
	const owner = await fixture("owner");
	const member = await fixture("user");
	const detail = await result<{ email: string }>(
		await request(`/api/admin/users/${member.id}`, "GET", undefined, owner.cookie),
	);
	expect(detail.email).toBe(`${member.email[0]}***@example.com`);
	const list = await result<{ items: { email: string }[] }>(
		await request("/api/admin/users", "GET", undefined, owner.cookie),
	);
	expect(list.items.every((row) => row.email.includes("***"))).toBe(true);
	const sessions = await result<{ items: Record<string, unknown>[] }>(
		await request(`/api/admin/users/${member.id}/sessions`, "GET", undefined, owner.cookie),
	);
	expect(sessions.items.length).toBeGreaterThan(0);
	for (const row of sessions.items)
		expect(Object.keys(row).sort()).toEqual(["createdAt", "expiresAt", "id"]);
	expect(JSON.stringify(sessions)).not.toContain(member.cookie);
	await error(
		await request(
			`/api/admin/users/missing-${crypto.randomUUID()}`,
			"GET",
			undefined,
			owner.cookie,
		),
		404,
		"NOT_FOUND",
	);
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `reason-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	for (const reason of ["", "123456789", "x".repeat(501), "   "])
		await error(
			await request(`/api/admin/sites/${site.id}/suspend`, "POST", { reason }, owner.cookie),
			400,
		);
	expect(
		(
			await request(
				`/api/admin/sites/${site.id}/suspend`,
				"POST",
				{ reason: "1234567890" },
				owner.cookie,
			)
		).status,
	).toBe(200);
	expect(
		(
			await request(
				`/api/admin/sites/${site.id}/resume`,
				"POST",
				{ reason: "x".repeat(500) },
				owner.cookie,
			)
		).status,
	).toBe(200);
});

test("shared policy matches native grants and keeps disabled/P2 operations unavailable", async () => {
	for (const [role, permissions] of Object.entries(rolePermissions)) {
		for (const permission of permissions) {
			const [resource, action] = permission.split(".");
			expect(
				accessRoles[role as keyof typeof accessRoles].authorize({ [resource]: [action] }).success,
			).toBe(true);
		}
		expect(permissionsFor(role).includes("user.impersonate")).toBe(false);
		expect(permissionsFor(role).includes("user.set_password")).toBe(false);
		for (const action of [
			"impersonate",
			"impersonate-admins",
			"set-password",
			"create",
			"update",
			"set-email",
		])
			expect(
				accessRoles[role as keyof typeof accessRoles].authorize({ user: [action] } as never)
					.success,
			).toBe(false);
	}
	expect(permissionsFor("admin")).toEqual([]);
	expect(permissionsFor("unknown")).toEqual([]);
	expect(hasPermission("analyst", "note", "read")).toBe(false);
	expect(hasPermission("support", "note", "read")).toBe(true);
	const owner = await fixture("owner");
	const member = await fixture("user");
	for (const operation of [
		() => auth.api.banUser({ headers: owner.headers, body: { userId: member.id } }),
		() => auth.api.setRole({ headers: owner.headers, body: { userId: member.id, role: "owner" } }),
		() => auth.api.removeUser({ headers: owner.headers, body: { userId: member.id } }),
	])
		await expect(operation()).rejects.toMatchObject({ body: { code: "ADMIN_SECURITY_PENDING" } });
	await expect(
		auth.api.impersonateUser({ headers: owner.headers, body: { userId: member.id } }),
	).rejects.toMatchObject({ body: { code: "PERMISSION_DENIED" } });
	await expect(
		auth.api.setUserPassword({
			headers: owner.headers,
			body: { userId: member.id, newPassword: "Never-applied-password" },
		}),
	).rejects.toMatchObject({ body: { code: "PERMISSION_DENIED" } });
	const [unchanged] = await db.select().from(user).where(eq(user.id, member.id));
	expect(unchanged.role).toBe("user");
	expect(unchanged.banned).toBe(false);
	// Signup-supplied authority remains invalid; no legacy/owner account can be created by signup.
	const response = await request("/api/auth/sign-up/email", "POST", {
		name: "Invalid grant",
		email: `invalid-${crypto.randomUUID()}@example.com`,
		password: "Fixture-password-123",
		role: "owner",
	});
	expect(response.status).toBe(400);
});
