import { Hono } from "hono";
import { auth } from "./lib/auth";
import type { AuthEnv } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { registerHttpMiddleware } from "./middleware/http";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import { runtimeRoutes } from "./routes/runtime";
import { siteRoutes } from "./routes/sites";
import { cacheInvalidationService } from "./services/cache-invalidation";

const app = new Hono<AuthEnv>();
registerHttpMiddleware(app);

/**
 * Drains committed public-output intents before returning a mutation response. The mutation has
 * already committed, so a flush failure must not turn its response into an error: the intent stays
 * in the durable outbox for the retry and the daily backstop.
 */
app.use("*", async (c, next) => {
	await next();
	if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return;
	try {
		await cacheInvalidationService.flushAffected();
	} catch {
		console.error(JSON.stringify({ event: "cache_flush_failed" }));
	}
});

/** Delegates authentication protocol responses directly to Better Auth. */
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/", runtimeRoutes);

app.route("/api", accountRoutes);

app.route("/api/admin", adminRoutes);
app.route("/api/sites", siteRoutes);
app.route("/api/public", publicRoutes);

/** Reports unmatched endpoints using the domain error contract. */
app.notFound((c) => c.json({ status: false, error: "NOT_FOUND", code: "NOT_FOUND" }, 404));
app.onError(errorHandler);

export default app;
