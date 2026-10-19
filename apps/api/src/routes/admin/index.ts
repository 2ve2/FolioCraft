import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminAuditRoutes } from "./audit";
import { adminNoticeRoutes } from "./notices";
import { adminReportRoutes } from "./reports";
import { adminRequestRoutes } from "./requests";
import { adminResourceRoutes } from "./resources";
import { adminSiteRoutes } from "./sites";
import { adminStaffRoutes } from "./staff";
import { adminUserRoutes } from "./users";

// Apply the administrator gate before registering any child route.
export const adminRoutes = new Hono<AuthEnv>();
adminRoutes.use("*", requireAdmin);

// Each child owns one administrative responsibility; public HTTP paths are unchanged.
adminRoutes.route("/", adminSiteRoutes);
adminRoutes.route("/", adminResourceRoutes);
adminRoutes.route("/", adminAuditRoutes);

adminRoutes.route("/", adminUserRoutes);

adminRoutes.route("/", adminReportRoutes);

adminRoutes.route("/", adminNoticeRoutes);

adminRoutes.route("/", adminRequestRoutes);
adminRoutes.route("/", adminStaffRoutes);
