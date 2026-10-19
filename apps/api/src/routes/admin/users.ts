import { parseRoles, permissionsFor } from "@ichnara/contracts/admin-policy";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminUserService } from "../../services/admin/user-service";
import { booleanQuery } from "./validation";

export const adminUserRoutes = new Hono<AuthEnv>();

/** Returns the current database-backed policy to drive administrative navigation and controls. */
adminUserRoutes.get("/me/permissions", requirePermission("user", "read"), (c) => {
	const role = c.get("authSession").user.role;
	return successResponse(c, { roles: parseRoles(role), permissions: permissionsFor(role) });
});

/** Preserves existing bounded pagination while replacing raw native user responses with masked DTOs. */
adminUserRoutes.get("/users", requirePermission("user", "read"), async (c) => {
	const query = z
		.object({
			limit: z.coerce.number().int().min(1).max(100).default(20),
			cursor: z.string().min(1).max(128).optional(),
			search: z.string().trim().max(100).optional(),
			role: z.enum(["user", "owner", "moderator", "support", "analyst"]).optional(),
			banned: booleanQuery.optional(),
			verified: booleanQuery.optional(),
		})
		.strict()
		.parse(c.req.query());
	return successResponse(c, await adminUserService.list(c.req.raw.headers, query));
});

/** Validates native text IDs without assuming the site's UUID identifier format. */
function userId(value: string) {
	return z.string().trim().min(1).max(128).parse(value);
}

/** Exposes a masked account detail using the native permission-aware server method. */
adminUserRoutes.get("/users/:id", requirePermission("user", "read"), async (c) =>
	successResponse(c, await adminUserService.get(c.req.raw.headers, userId(c.req.param("id")))),
);

/** Exposes bounded session metadata using a native internal read, never its authentication tokens. */
adminUserRoutes.get("/users/:id/sessions", requirePermission("user", "read"), async (c) =>
	successResponse(c, await adminUserService.sessions(c.req.raw.headers, userId(c.req.param("id")))),
);

for (const operation of ["ban", "unban", "revoke-sessions", "remove"] as const) {
	adminUserRoutes.post(
		`/users/:id/${operation}`,
		requirePermission("user", operation === "revoke-sessions" ? "revoke_session" : operation),
		async (c) =>
			successResponse(
				c,
				await adminUserService.mutate(
					c.req.raw.headers,
					userId(c.req.param("id")),
					operation,
					await c.req.json(),
				),
			),
	);
}

/** Accepts a metadata session ID scoped to the selected account, never a browser-supplied token. */
adminUserRoutes.post(
	"/users/:id/sessions/:sessionId/revoke",
	requirePermission("user", "revoke_session"),
	async (c) =>
		successResponse(
			c,
			await adminUserService.mutate(
				c.req.raw.headers,
				userId(c.req.param("id")),
				"revoke-session",
				await c.req.json(),
				userId(c.req.param("sessionId")),
			),
		),
);

/** A POST intentionally reveals one email through the full sensitive pipeline. */
adminUserRoutes.post(
	"/users/:id/reveal-email",
	requirePermission("user", "read_email"),
	async (c) =>
		successResponse(
			c,
			await adminUserService.revealEmail(
				c.req.raw.headers,
				userId(c.req.param("id")),
				await c.req.json(),
			),
		),
);
