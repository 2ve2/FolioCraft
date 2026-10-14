import { Hono } from "hono";
import { auth } from "../lib/auth";
import { ApiError, successResponse } from "../lib/response-helpers";
import { type AuthEnv, requireAuth } from "../middleware/auth";

export const accountRoutes = new Hono<AuthEnv>();
/** Returns the current authenticated user with only the client-required account fields. */
accountRoutes.get("/me", requireAuth, async (c) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) throw new ApiError(401, "UNAUTHORIZED");
	return successResponse(c, {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		emailVerified: session.user.emailVerified,
	});
});
