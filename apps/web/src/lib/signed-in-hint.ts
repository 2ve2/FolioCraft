/**
 * Remembers that this browser holds a session so the bare address can open the studio directly.
 * The session cookie belongs to the API origin and is invisible here; this hint is not a
 * credential and carries no identity, and the studio still verifies the session with the API.
 */
export const signedInCookie = "ichnara-signed-in";

/** Keeps the hint until the session itself expires. */
export function rememberSignedIn(expiresAt: number) {
	const secure = window.location.protocol === "https:" ? "; secure" : "";
	const expires = new Date(expiresAt).toUTCString();
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not available in every supported browser.
	document.cookie = `${signedInCookie}=1; path=/; expires=${expires}; samesite=lax${secure}`;
}

/** Drops the hint once the API confirms there is no session. */
export function forgetSignedIn() {
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not available in every supported browser.
	document.cookie = `${signedInCookie}=; path=/; max-age=0; samesite=lax`;
}
