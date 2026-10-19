import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminService } from "../../services/admin/site-service";
import { readOverview, readSystem } from "../../services/admin/system-service";

/** Exposes aggregate operational counts after the parent administrator gate. */
export const adminResourceRoutes = new Hono<AuthEnv>();

/** Returns resource totals without disclosing private content or authentication credentials. */
adminResourceRoutes.get("/resources", requirePermission("system", "read"), async (c) => {
	return successResponse(c, await adminService.resources());
});

adminResourceRoutes.get("/system", requirePermission("system", "read"), async (c) =>
	successResponse(c, await readSystem()),
);
adminResourceRoutes.get("/overview", requirePermission("user", "read"), async (c) =>
	successResponse(c, await readOverview(c.get("authSession").user.role)),
);
