"use client";
import { authClient } from "./auth-client";

/**
 * Reads the account session for platform screens. Better Auth re-checks the session whenever the
 * tab becomes visible and keeps the known session when that check fails, so a failed background
 * check is reported only when no session is known: a passing network or database hiccup must not
 * replace an open workspace with an error screen (the API still rejects an expired session on the
 * next request).
 */
export function useAccountSession() {
	const state = authClient.useSession();
	return { ...state, error: state.data ? null : state.error };
}
