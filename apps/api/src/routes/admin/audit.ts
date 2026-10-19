import { Hono } from "hono";
import { z } from "zod";
import { env } from "../../config/env";
import { successResponse } from "../../lib/response-helpers";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { exportAdminAudit } from "../../services/admin/audit-export";
import { listAdminAudit } from "../../services/admin/audit-service";
import { sensitiveSchema } from "../../services/admin/sensitive-action";
import { auditFiltersSchema, auditQuery } from "./validation";

/** Owns validated, bounded administration audit reads. */
export const adminAuditRoutes = new Hono<AuthEnv>();

/** Lists bounded audit history with validated filters available exclusively to administrators. */
adminAuditRoutes.get("/audit", requirePermission("audit", "read"), async (c) => {
	const query = auditQuery
		.refine((q) => !q.from || !q.to || new Date(q.from).getTime() <= new Date(q.to).getTime(), {
			message: "Invalid time range",
		})
		.parse(c.req.query());
	return successResponse(
		c,
		await listAdminAudit(query.limit, query.offset, query.actorId, query.action, query),
	);
});

adminAuditRoutes.post("/audit/export", requirePermission("audit", "export"), async (c) => {
	const input = sensitiveSchema
		.extend({
			filters: auditFiltersSchema,
			maxRows: z.number().int().min(1).max(env.ADMIN_AUDIT_EXPORT_MAX_ROWS),
		})
		.parse(await c.req.json());
	const csv = await exportAdminAudit(
		c.req.raw.headers,
		{ reason: input.reason, password: input.password },
		input.filters,
		input.maxRows,
	);
	c.header("Content-Type", "text/csv; charset=utf-8");
	c.header("Content-Disposition", 'attachment; filename="admin-activity.csv"');
	c.header("X-Content-Type-Options", "nosniff");
	return c.body(csv);
});
