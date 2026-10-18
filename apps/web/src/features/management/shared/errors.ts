import type { Locale } from "@ichnara/contracts";
import { ApiError } from "../../../lib/api";
import { text } from "./copy";

/** Maps management API errors to localized, non-sensitive feedback. */
export function errorText(error: unknown, locale: Locale) {
	const t = text[locale];
	if (error instanceof ApiError) {
		if (error.code === "INVALID_PASSWORD") return t.invalidPassword;
		if (error.code === "ADMIN_ACTION_UNAVAILABLE") return t.actionUnavailable;
		if (error.code === "ADMIN_AUDIT_UNAVAILABLE") return t.auditUnavailable;
		if (error.code === "ADMIN_ACTION_INDETERMINATE") return t.indeterminate;
		if (error.status === 429) return t.rateLimited;
		if (error.code === "YOU_CANNOT_BAN_YOURSELF" || error.code === "YOU_CANNOT_REMOVE_YOURSELF")
			return t.protectedAccount;
		if (error.code.startsWith("YOU_ARE_NOT_ALLOWED")) return t.forbidden;
		if (error.code === "PUBLICATION_CONFLICT") return t.conflict;
		if (error.code === "MODERATION_CONFLICT") return t.moderationConflict;
		if (error.status === 401 || error.code === "EMAIL_NOT_VERIFIED") return t.denied;
		if (error.status === 403) return t.forbidden;
		if (error.status === 0) return t.unavailable;
	}
	return t.failed;
}

/** Keep native Better Auth status/code while preserving its response protocol. */
export function nativeError(error: { code?: string; message?: string; status: number }) {
	return new ApiError(
		error.code || "REQUEST_FAILED",
		error.message || "Request failed",
		error.status,
	);
}
