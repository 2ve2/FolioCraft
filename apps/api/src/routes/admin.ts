import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId, paginationSchema } from "../lib/validation";
import { requireAdmin } from "../middleware/admin";
import type { AuthEnv } from "../middleware/auth";
import { adminService } from "../services/adminService";
import { listAdminAudit } from "../services/auditService";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");
const reasonSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
const auditQuery = paginationSchema.extend({
	actorId: z.string().trim().min(1).max(128).optional(),
	action: z.string().trim().min(1).max(100).optional(),
	targetType: z.enum(["site", "user", "session"]).optional(),
	targetId: z.string().trim().min(1).max(128).optional(),
	status: z.enum(["attempted", "succeeded", "failed"]).optional(),
});

export const adminRoutes = new Hono<AuthEnv>();
adminRoutes.use("*", requireAdmin);

/** Returns a validated bounded page of administrative site metadata. */
adminRoutes.get("/sites", async (c) => {
	const query = paginationSchema
		.extend({ suspended: booleanQuery.optional(), published: booleanQuery.optional() })
		.parse(c.req.query());
	return successResponse(
		c,
		await adminService.listSites(query.limit, query.offset, query.suspended, query.published),
	);
});

/** Returns site metadata and resource counts after the administrator gate. */
adminRoutes.get("/sites/:id", async (c) => {
	return successResponse(c, await adminService.site(entityId(c.req.param("id"))));
});

/** Returns resource totals without disclosing private content or authentication credentials. */
adminRoutes.get("/resources", async (c) => {
	return successResponse(c, await adminService.resources());
});

/** Suspends public availability and records the supplied reason in the same transaction. */
adminRoutes.post("/sites/:id/suspend", async (c) => {
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
adminRoutes.post("/sites/:id/resume", async (c) => {
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

/** Lists bounded audit history with validated filters available exclusively to administrators. */
adminRoutes.get("/audit", async (c) => {
	const query = auditQuery.parse(c.req.query());
	return successResponse(
		c,
		await listAdminAudit(query.limit, query.offset, query.actorId, query.action, query),
	);
});
