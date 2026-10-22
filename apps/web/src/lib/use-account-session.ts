"use client";
import { useEffect } from "react";
import { authClient } from "./auth-client";
import { forgetSignedIn, rememberSignedIn } from "./signed-in-hint";

/**
 * Reads the account session for platform screens. Better Auth re-checks the session whenever the
 * tab becomes visible and keeps the known session when that check fails, so a failed background
 * check is reported only when no session is known: a passing network or database hiccup must not
 * replace an open workspace with an error screen (the API still rejects an expired session on the
 * next request). Also keeps the signed-in hint used by the bare address in step with the session.
 */
export function useAccountSession() {
	const state = authClient.useSession();
	const { data, isPending, error } = state;
	const signedIn = Boolean(data?.user);
	const expiresAt = data ? new Date(data.session.expiresAt).getTime() : 0;
	useEffect(() => {
		if (signedIn) rememberSignedIn(Number.isFinite(expiresAt) ? expiresAt : Date.now() + 864e5);
		else if (!isPending && !error) forgetSignedIn();
	}, [signedIn, expiresAt, isPending, error]);
	return { ...state, error: data ? null : error };
}
