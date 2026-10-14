import { createMiddleware } from "hono/factory";
import { requireEmailVerification } from "../config/env";
import { auth } from "../lib/auth";
import { ApiError } from "../lib/response-helpers";
import { rateLimitService } from "../services/rateLimitService";
export type AuthEnv = { Variables: { userId: string; authSession: typeof auth.$Infer.Session } };

/** Authenticates private requests against the database and bounds authenticated writes. */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
	if (c.get("authSession")) return next();
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) throw new ApiError(401, "UNAUTHORIZED");
	if (
		session.user.banned &&
		(!session.user.banExpires || session.user.banExpires.getTime() > Date.now())
	)
		throw new ApiError(403, "ACCOUNT_BANNED");
	if (requireEmailVerification && !session.user.emailVerified)
		throw new ApiError(403, "EMAIL_NOT_VERIFIED");
	c.set("userId", session.user.id);
	c.set("authSession", session);
	if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
		const limit = await rateLimitService.consume(`private-write:${session.user.id}`, 120, 60);
		if (!limit.allowed) {
			c.header("Retry-After", String(limit.retryAfter));
			throw new ApiError(429, "RATE_LIMITED");
		}
	}
	c.header("Cache-Control", "no-store");
	await next();
});
