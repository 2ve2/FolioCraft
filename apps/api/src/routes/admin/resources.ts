import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminService } from "../../services/admin/site-service";

/** Exposes aggregate operational counts after the parent administrator gate. */
export const adminResourceRoutes = new Hono<AuthEnv>();

/** Returns resource totals without disclosing private content or authentication credentials. */
adminResourceRoutes.get("/resources", requirePermission("system", "read"), async (c) => {
	return successResponse(c, await adminService.resources());
});
