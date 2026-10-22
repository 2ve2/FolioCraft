import type { StudioSession } from "@ichnara/contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiResponse<T = unknown> {
	status: boolean;
	result?: T;
	message?: string;
	error?: string;
	code?: string;
	fields?: unknown;
	sessionIdentity?: StudioSession;
}

/** Returns a domain success envelope while preserving the requested HTTP status. */
export function successResponse<T>(
	c: Context,
	result: T,
	message?: string,
	statusCode: 200 | 201 | 202 = 200,
	sessionIdentity?: StudioSession,
): Response {
	const response: ApiResponse<T> = { status: true, result };
	if (message) response.message = message;
	if (sessionIdentity) response.sessionIdentity = sessionIdentity;
	return c.json(response, statusCode);
}

/** Returns a stable machine-readable error without exposing internal exception details. */
export function errorResponse(
	c: Context,
	error: string,
	statusCode: ContentfulStatusCode = 400,
	code = "REQUEST_FAILED",
	fields?: unknown,
): Response {
	const response: ApiResponse = { status: false, error, code };
	if (fields !== undefined) response.fields = fields;
	return c.json(response, statusCode);
}

/** Reports missing resources without revealing whether another user owns them. */
export function notFoundResponse(c: Context, message = "Resource not found"): Response {
	return errorResponse(c, message, 404, "NOT_FOUND");
}

/** Returns validated field errors using the common domain error contract. */
export function validationErrorResponse(c: Context, fields: unknown): Response {
	return errorResponse(c, "Validation failed", 400, "VALIDATION_ERROR", fields);
}

/** Requires an authenticated session before a private operation can continue. */
export function unauthorizedResponse(c: Context): Response {
	return errorResponse(c, "Authentication required", 401, "UNAUTHORIZED");
}

/** Rejects an authenticated operation that exceeds the caller's permissions. */
export function forbiddenResponse(c: Context, code = "FORBIDDEN"): Response {
	return errorResponse(c, "Access forbidden", 403, code);
}

/** Reports stale revisions or conflicting publication state with HTTP 409. */
export function conflictResponse(c: Context, code = "CONFLICT"): Response {
	return errorResponse(c, "Resource conflict", 409, code);
}

/** Hides server exception details behind a stable internal-error response. */
export function internalErrorResponse(c: Context): Response {
	return errorResponse(c, "Internal server error", 500, "INTERNAL_ERROR");
}

/** Maps direct or Drizzle-wrapped PostgreSQL failures to safe domain responses. */
export function databaseErrorResponse(c: Context, error: Error): Response {
	const wrapped = error as Error & { code?: string; cause?: { code?: string; message?: string } };
	const code = wrapped.cause?.code ?? wrapped.code;
	if (code === "23505") return conflictResponse(c, "ALREADY_EXISTS");
	if (["23503", "23514", "23502"].includes(code ?? ""))
		return errorResponse(c, "Invalid database reference or value", 400, "INVALID_REFERENCE");
	if (
		[
			"ECONNREFUSED",
			"ETIMEDOUT",
			"ETIMEOUT",
			"ECONNRESET",
			"ENOTFOUND",
			"EAI_AGAIN",
			"57P01",
			"08006",
			"57014",
		].includes(code ?? "") ||
		error.message === "Query read timeout" ||
		wrapped.cause?.message === "Query read timeout"
	)
		return errorResponse(c, "Database unavailable", 503, "DATABASE_UNAVAILABLE");
	return internalErrorResponse(c);
}

/** Carries intentional domain failures from services to the centralized error handler. */
export class ApiError extends Error {
	constructor(
		public status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 | 503,
		public code: string,
		/** Seconds until a rate-limited caller may retry; sent as Retry-After. */
		public retryAfter?: number,
	) {
		super(code);
	}
}
