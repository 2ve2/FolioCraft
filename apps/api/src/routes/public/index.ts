import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import { publicAssetRoutes } from "./assets";
import { publicInquiries } from "./inquiries";
import { publicReportRoutes } from "./reports";
import { publicSitemapRoutes } from "./sitemap";
import { publicSites } from "./sites";

// Public readers consume release projections; inquiry submission keeps its own validation.
export const publicRoutes = new Hono<AuthEnv>();
publicRoutes.route("/sites", publicSites);
publicRoutes.route("/sites", publicAssetRoutes);
publicRoutes.route("/sites", publicInquiries);
publicRoutes.route("/", publicSitemapRoutes);

publicRoutes.route("/sites", publicReportRoutes);
