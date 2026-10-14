import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import {
	ApiError,
	databaseErrorResponse,
	errorResponse,
	validationErrorResponse,
} from "../lib/response-helpers";

/** Converts route, validation and database failures into safe domain responses. */
export const errorHandler: ErrorHandler = (error, c) => {
	if (error instanceof ApiError) return errorResponse(c, error.code, error.status, error.code);
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
