/**
 * Builds the response security headers for every web route.
 *
 * Next.js hydrates through inline scripts and React applies inline styles, so script/style
 * sources keep 'unsafe-inline' (nonces would force every static page to render per request).
 * The policy still restricts every other source to this app, the API and private R2, and
 * forbids framing, plugins, foreign form targets and base-URL rewriting. Transport upgrades
 * and HSTS apply only when the app is served over HTTPS, so local HTTP runs keep working.
 */
export function securityHeaders({
	apiOrigin,
	webOrigin,
	development,
}: {
	apiOrigin: string;
	webOrigin: string;
	development: boolean;
}): { key: string; value: string }[] {
	const api = new URL(apiOrigin).origin;
	const secure = new URL(webOrigin).protocol === "https:";
	// Owner uploads PUT to, and private previews/public redirects read from, presigned R2 URLs.
	const storage = "https://*.r2.cloudflarestorage.com";
	const directives = [
		"default-src 'self'",
		`script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' data: blob: ${api} ${storage}`,
		"font-src 'self'",
		`connect-src 'self' ${api} ${storage}${development ? " ws: wss:" : ""}`,
		"frame-src 'none'",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"manifest-src 'self'",
		"worker-src 'self' blob:",
		...(secure ? ["upgrade-insecure-requests"] : []),
	];
	return [
		{ key: "Content-Security-Policy", value: directives.join("; ") },
		{ key: "X-Frame-Options", value: "DENY" },
		{ key: "X-Content-Type-Options", value: "nosniff" },
		{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
		{
			key: "Permissions-Policy",
			value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
		},
		{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
		// No includeSubDomains/preload: the trial apex hosts unrelated owner subdomains.
		...(secure ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
	];
}
