import { idSchema } from "@ichnara/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { entityId, paginationSchema } from "../../lib/validation";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminService } from "../../services/admin/site-service";
import { booleanQuery } from "./validation";

/** Owns administrative site lookup and audited availability changes. */
export const adminSiteRoutes = new Hono<AuthEnv>();

/** Returns a validated bounded page of administrative site metadata. */
adminSiteRoutes.get("/sites", requirePermission("site", "read"), async (c) => {
	const query = paginationSchema
		.extend({
			suspended: booleanQuery.optional(),
			published: booleanQuery.optional(),
			reported: booleanQuery.optional(),
			cursor: idSchema.optional(),
			ownerId: z.string().min(1).max(128).optional(),
		})
		.parse(c.req.query());
	return successResponse(c, await adminService.listSites(query));
});

/** Returns site metadata and resource counts after the administrator gate. */
adminSiteRoutes.get("/sites/:id", requirePermission("site", "read"), async (c) => {
	return successResponse(c, await adminService.site(entityId(c.req.param("id"))));
});

/** Suspends public availability and records the supplied reason in the same transaction. */
adminSiteRoutes.post("/sites/:id/suspend", requirePermission("site", "suspend"), async (c) => {
	const input = await c.req.json();
	return successResponse(
		c,
		await adminService.moderate(entityId(c.req.param("id")), true, c.req.raw.headers, input),
	);
});

/** Resumes a suspended site while retaining the required explanation in its audit history. */
adminSiteRoutes.post("/sites/:id/resume", requirePermission("site", "resume"), async (c) => {
	const input = await c.req.json();
	return successResponse(
		c,
		await adminService.moderate(entityId(c.req.param("id")), false, c.req.raw.headers, input),
	);
});
