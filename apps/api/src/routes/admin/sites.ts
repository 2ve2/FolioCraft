import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import { entityId, paginationSchema } from "../../lib/validation";
import type { AuthEnv } from "../../middleware/auth";
import { adminService } from "../../services/admin/site-service";
import { booleanQuery, reasonSchema } from "./validation";

/** Owns administrative site lookup and audited availability changes. */
export const adminSiteRoutes = new Hono<AuthEnv>();

/** Returns a validated bounded page of administrative site metadata. */
adminSiteRoutes.get("/sites", async (c) => {
	const query = paginationSchema
		.extend({ suspended: booleanQuery.optional(), published: booleanQuery.optional() })
		.parse(c.req.query());
	return successResponse(
		c,
		await adminService.listSites(query.limit, query.offset, query.suspended, query.published),
	);
});

/** Returns site metadata and resource counts after the administrator gate. */
adminSiteRoutes.get("/sites/:id", async (c) => {
	return successResponse(c, await adminService.site(entityId(c.req.param("id"))));
});

/** Suspends public availability and records the supplied reason in the same transaction. */
adminSiteRoutes.post("/sites/:id/suspend", async (c) => {
	const input = reasonSchema.parse(await c.req.json());
	return successResponse(
		c,
		await adminService.moderate(entityId(c.req.param("id")), true, {
			actorId: c.get("userId"),
			requestId: c.get("requestId"),
			reason: input.reason,
		}),
	);
});

/** Resumes a suspended site while retaining the required explanation in its audit history. */
adminSiteRoutes.post("/sites/:id/resume", async (c) => {
	const input = reasonSchema.parse(await c.req.json());
	return successResponse(
		c,
		await adminService.moderate(entityId(c.req.param("id")), false, {
			actorId: c.get("userId"),
			requestId: c.get("requestId"),
			reason: input.reason,
		}),
	);
});
