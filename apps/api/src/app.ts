import { Hono } from "hono";
import { auth } from "./lib/auth";
import type { AuthEnv } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { registerHttpMiddleware } from "./middleware/http";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { assetRoutes } from "./routes/assets";
import { contentRoutes } from "./routes/content";
import { privateInquiries } from "./routes/inquiries";
import { publicAssetRoutes } from "./routes/public-assets";
import { publicInquiries } from "./routes/public-inquiries";
import { publicSitemapRoutes } from "./routes/public-sitemap";
import { publicSites } from "./routes/public-sites";
import { releaseRoutes } from "./routes/releases";
import { runtimeRoutes } from "./routes/runtime";
import { privateSites } from "./routes/sites";

const app = new Hono<AuthEnv>();
registerHttpMiddleware(app);

/** Delegates authentication protocol responses directly to Better Auth. */
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/", runtimeRoutes);

app.route("/api", accountRoutes);

privateSites.route("/:id", contentRoutes);
privateSites.route("/", releaseRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/sites", privateSites);
app.route("/api/sites", assetRoutes);
app.route("/api/sites", privateInquiries);
app.route("/api/public/sites", publicSites);
app.route("/api/public/sites", publicAssetRoutes);
app.route("/api/public/sites", publicInquiries);
app.route("/api/public", publicSitemapRoutes);

/** Reports unmatched endpoints using the domain error contract. */
app.notFound((c) => c.json({ status: false, error: "NOT_FOUND", code: "NOT_FOUND" }, 404));
app.onError(errorHandler);

export default app;
