import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import type { AuthEnv } from "../../middleware/auth";
import { listAdminAudit } from "../../services/admin/audit-service";
import { auditQuery } from "./validation";

/** Owns validated, bounded administration audit reads. */
export const adminAuditRoutes = new Hono<AuthEnv>();

/** Lists bounded audit history with validated filters available exclusively to administrators. */
adminAuditRoutes.get("/audit", async (c) => {
	const query = auditQuery.parse(c.req.query());
	return successResponse(
		c,
		await listAdminAudit(query.limit, query.offset, query.actorId, query.action, query),
	);
});
