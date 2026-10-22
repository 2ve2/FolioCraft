import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { apiOrigin } from "./api-origin";

export const authClient = createAuthClient({
	baseURL: apiOrigin,
	plugins: [adminClient(), twoFactorClient()],
});

// Native sign-in only changes Better Auth's local signal. Mirror mutations between open tabs
// with an identity-free, nonpersistent notification; auth configuration and cookies stay native.
/** Falls back to sequential startup if transient cross-tab observation is unavailable. */
function openSessionChannel() {
	if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
	try {
		return new BroadcastChannel("ichnara-session-change");
	} catch {
		return null;
	}
}
const sessionChanges = openSessionChannel();
export const canObserveRemoteSessionChanges = sessionChanges !== null;
if (sessionChanges)
	authClient.$store.atoms.$sessionSignal.listen(() => sessionChanges.postMessage("changed"));

/** Observes other tabs' native mutations without broadcasting any account or session data. */
export function subscribeRemoteSessionChanges(onChange: () => void) {
	const receive = (event: MessageEvent<unknown>) => {
		if (event.data === "changed") onChange();
	};
	sessionChanges?.addEventListener("message", receive);
	return () => sessionChanges?.removeEventListener("message", receive);
}
