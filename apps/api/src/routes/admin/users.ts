import { parseRoles, permissionsFor } from "@ichnara/contracts/admin-policy";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { paginationSchema } from "../../lib/validation";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminUserService } from "../../services/admin/user-service";

export const adminUserRoutes = new Hono<AuthEnv>();

/** Returns the current database-backed policy to drive administrative navigation and controls. */
adminUserRoutes.get("/me/permissions", requirePermission("user", "read"), (c) => {
	const role = c.get("authSession").user.role;
	return successResponse(c, { roles: parseRoles(role), permissions: permissionsFor(role) });
});

/** Preserves existing bounded pagination while replacing raw native user responses with masked DTOs. */
adminUserRoutes.get("/users", requirePermission("user", "read"), async (c) => {
	const query = paginationSchema.parse(c.req.query());
	return successResponse(
		c,
		await adminUserService.list(c.req.raw.headers, query.limit, query.offset),
	);
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
