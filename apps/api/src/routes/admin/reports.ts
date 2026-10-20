import { idSchema, reportCategories, reportStatuses, reportStatusInput } from "@ichnara/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { entityId } from "../../lib/validation";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { reportService } from "../../services/reports";

export const adminReportRoutes = new Hono<AuthEnv>();
const querySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).default(20),
		cursor: z
			.string()
			.min(1)
			.max(512)
			.regex(/^[A-Za-z0-9_-]+$/)
			.optional(),
		status: z.enum(reportStatuses).optional(),
		category: z.enum(reportCategories).optional(),
		siteId: idSchema.optional(),
		ownerId: z.string().min(1).max(128).optional(),
	})
	.strict();
/** Exposes only filtered, oldest-first cursor pages to report readers. */
adminReportRoutes.get("/reports", requirePermission("report", "read"), async (c) =>
	successResponse(c, await reportService.list(querySchema.parse(c.req.query()))),
);
/** Returns the same minimized projection for every reader, including owners. */
adminReportRoutes.get("/reports/:id", requirePermission("report", "read"), async (c) =>
	successResponse(c, await reportService.get(entityId(c.req.param("id")))),
);
/** Requires the authoritative TOTP staff gate and the explicit handler permission before transitioning. */
adminReportRoutes.post("/reports/:id/status", requirePermission("report", "handle"), async (c) =>
	successResponse(
		c,
		await reportService.status(
			entityId(c.req.param("id")),
			reportStatusInput.parse(await c.req.json()),
			{ actorId: c.get("userId"), requestId: c.get("requestId") },
		),
	),
);
