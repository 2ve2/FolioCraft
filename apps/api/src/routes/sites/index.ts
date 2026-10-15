import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import { assetRoutes } from "./assets";
import { contentRoutes } from "./content";
import { privateSites } from "./drafts";
import { privateInquiries } from "./inquiries";
import { releaseRoutes } from "./releases";

// Preserve the original registration order and its ownership middleware coverage.
privateSites.route("/:id", contentRoutes);
privateSites.route("/", releaseRoutes);

export const siteRoutes = new Hono<AuthEnv>();
siteRoutes.route("/", privateSites);
siteRoutes.route("/", assetRoutes);
siteRoutes.route("/", privateInquiries);
