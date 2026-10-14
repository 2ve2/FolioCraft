import { createMiddleware } from "hono/factory";
import { ApiError } from "../lib/response-helpers";
import { type AuthEnv, requireAuth } from "./auth";

/** Requires a real Better Auth admin role; impersonated user sessions never gain admin access. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
	await requireAuth(c, async () => {});
	const session = c.get("authSession");
	if (!session?.user.role?.split(",").includes("admin") || session.session.impersonatedBy)
		throw new ApiError(403, "ADMIN_REQUIRED");
	await next();
});
