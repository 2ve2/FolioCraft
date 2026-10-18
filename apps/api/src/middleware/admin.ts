import {
	type AdminAction,
	type AdminResource,
	hasPermission,
	isStaff,
	permissionsFor,
} from "@ichnara/contracts/admin-policy";
import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { matchedRoutes } from "hono/route";
import { ApiError } from "../lib/response-helpers";
import { type AuthEnv, requireAuth } from "./auth";

const declarations = new WeakMap<MiddlewareHandler<AuthEnv>, string>();

/** Attaches a permission declaration to the actual middleware used by the mounted endpoint. */
export function requirePermission<R extends AdminResource>(resource: R, action: AdminAction<R>) {
	const middleware = createMiddleware<AuthEnv>(async (c, next) => {
		if (!hasPermission(c.get("authSession")?.user.role, resource, action))
			throw new ApiError(403, "PERMISSION_DENIED");
		await next();
	});
	declarations.set(middleware, `${resource}.${action}`);
	return middleware;
}

/** Exposes declarations for actual mounted-route enumeration instead of a parallel manifest. */
export function declaredPermission(handler: MiddlewareHandler<AuthEnv>) {
	return declarations.get(handler);
}

/** Requires a real staff session and refuses execution of any undeclared administrative route. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
	await requireAuth(c, async () => {});
	const session = c.get("authSession");
	if (!isStaff(session?.user.role) || session.session.impersonatedBy)
		throw new ApiError(403, "ADMIN_REQUIRED");
	const routes = matchedRoutes(c).filter(
		(route) => route.path.startsWith("/api/admin/") && route.handler !== requireAdmin,
	);
	const groups = new Map<string, typeof routes>();
	for (const route of routes) {
		const key = `${route.method}:${route.path}`;
		const group = groups.get(key) ?? [];
		group.push(route);
		groups.set(key, group);
	}
	if (!groups.size) throw new ApiError(403, "ADMIN_PERMISSION_UNDECLARED");
	const grants = permissionsFor(session.user.role);
	for (const group of groups.values()) {
		const declared = group.map((route) => declaredPermission(route.handler)).filter(Boolean);
		if (!declared.length) throw new ApiError(403, "ADMIN_PERMISSION_UNDECLARED");
		if (declared.some((permission) => !grants.includes(permission as (typeof grants)[number])))
			throw new ApiError(403, "PERMISSION_DENIED");
	}
	await next();
});

/** Blocks native administration over HTTP; server auth.api calls still execute Better Auth hooks. */
export const blockNativeAdminHttp = createMiddleware<AuthEnv>(async (c, next) => {
	let path: string;
	try {
		path = decodeURIComponent(new URL(c.req.url).pathname).replace(/\\/g, "/").replace(/\/+/g, "/");
	} catch {
		throw new ApiError(400, "INVALID_AUTH_PATH");
	}
	// Reject the entire decoded admin namespace, including trailing slashes and encoded separators.
	if (/^\/api\/auth\/admin(?:\/|$)/i.test(path)) {
		c.header("Cache-Control", "no-store");
		throw new ApiError(403, "NATIVE_ADMIN_HTTP_DISABLED");
	}
	await next();
});
