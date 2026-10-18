import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { env } from "../config/env";
import { ApiError, errorResponse } from "../lib/response-helpers";
import { blockNativeAdminHttp } from "./admin";
import type { AuthEnv } from "./auth";

/** Prevents API caching and rejects writes from origins outside the configured web app. */
const protectApiRequests = createMiddleware<AuthEnv>(async (c, next) => {
	c.header("Cache-Control", "no-store");
	if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && c.req.header("origin") !== env.WEB_URL)
		throw new ApiError(403, "INVALID_ORIGIN");
	await next();
});

/** Records request timing and status without logging credentials or request bodies. */
const logRequests = createMiddleware<AuthEnv>(async (c, next) => {
	const start = performance.now();
	await next();
	if (env.NODE_ENV !== "test")
		console.info(
			JSON.stringify({
				event: "request",
				requestId: c.get("requestId"),
				method: c.req.method,
				status: c.res.status,
				durationMs: Math.round(performance.now() - start),
			}),
		);
});

/** Installs shared HTTP protections in the same order for every mounted domain route. */
export function registerHttpMiddleware(app: Hono<AuthEnv>) {
	app.use("*", requestId({ generator: () => crypto.randomUUID() }));
	const securityHeaders = secureHeaders();
	app.use("*", async (c, next) => {
		await securityHeaders(c, next);
		// Published images are embedded by the separately hosted web app. Only the
		// validated public asset redirect may relax the default resource policy.
		if (
			["GET", "HEAD"].includes(c.req.method) &&
			c.req.routePath === "/api/public/sites/:slug/assets/:assetId" &&
			c.res.status === 302
		)
			c.header("Cross-Origin-Resource-Policy", "cross-origin");
	});
	app.use("*", blockNativeAdminHttp);
	app.use(
		"*",
		cors({
			origin: env.WEB_URL,
			credentials: true,
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowHeaders: ["Content-Type"],
			exposeHeaders: ["X-Request-Id", "Retry-After"],
		}),
	);
	app.use(
		"/api/*",
		bodyLimit({
			maxSize: 1_048_576,
			onError: (c) => errorResponse(c, "BODY_TOO_LARGE", 413, "BODY_TOO_LARGE"),
		}),
	);
	app.use("/api/*", protectApiRequests);
	app.use("*", logRequests);
}
