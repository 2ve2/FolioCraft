import { isStaff } from "@ichnara/contracts/admin-policy";
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import {
	ApiError,
	databaseErrorResponse,
	errorResponse,
	validationErrorResponse,
} from "../lib/response-helpers";
import { recordSensitiveDenial, sensitiveRoute } from "../services/admin/sensitive-action";

/** Converts route, validation and database failures into safe domain responses. */
export const errorHandler: ErrorHandler = async (error, c) => {
	const action = ["POST", "PATCH"].includes(c.req.method) ? sensitiveRoute(c.req.path) : undefined;
	const actor = c.get("authSession");
	// Only staff denials are audit-worthy; ordinary accounts are refused by the admin gate and must
	// not be able to fill the administrative audit log.
	if (
		action &&
		actor?.user &&
		isStaff(actor.user.role) &&
		((error instanceof ApiError && error.status < 500) ||
			(error instanceof ApiError && error.code === "ADMIN_ACTION_UNAVAILABLE") ||
			error instanceof ZodError ||
			error instanceof SyntaxError)
	) {
		try {
			await recordSensitiveDenial(actor.user.id, action, error);
		} catch {
			return errorResponse(c, "Audit unavailable", 503, "ADMIN_AUDIT_UNAVAILABLE");
		}
	}
	if (error instanceof ApiError) {
		if (error.retryAfter !== undefined) c.header("Retry-After", String(error.retryAfter));
		return errorResponse(c, error.code, error.status, error.code);
	}
	if (error instanceof ZodError) return validationErrorResponse(c, error.flatten());
	if (error instanceof SyntaxError)
		return errorResponse(c, "Invalid JSON body", 400, "INVALID_JSON");
	if (error instanceof HTTPException)
		return errorResponse(c, "Request rejected", error.status, "REQUEST_REJECTED");
	const wrapped = error as Error & { code?: string; cause?: { code?: string } };
	console.error(
		JSON.stringify({
			event: "request_failed",
			requestId: c.get("requestId"),
			path: c.req.path,
			name: error.name,
			databaseCode: wrapped.cause?.code ?? wrapped.code,
		}),
	);
	return databaseErrorResponse(c, error);
};
