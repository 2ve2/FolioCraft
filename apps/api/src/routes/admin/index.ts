import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { adminAuditRoutes } from "./audit";
import { adminResourceRoutes } from "./resources";
import { adminSiteRoutes } from "./sites";

// Apply the administrator gate before registering any child route.
export const adminRoutes = new Hono<AuthEnv>();
adminRoutes.use("*", requireAdmin);

// Each child owns one administrative responsibility; public HTTP paths are unchanged.
adminRoutes.route("/", adminSiteRoutes);
adminRoutes.route("/", adminResourceRoutes);
adminRoutes.route("/", adminAuditRoutes);
