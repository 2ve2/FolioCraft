import { expect, test } from "bun:test";
import { securityHeaders } from "../src/lib/security-headers";

/** Indexes headers by name for direct assertions. */
const byName = (headers: { key: string; value: string }[]) =>
	Object.fromEntries(headers.map((header) => [header.key, header.value]));

test("production headers forbid framing and restrict sources to the app, API and private R2", () => {
	const headers = byName(
		securityHeaders({
			apiOrigin: "https://api.example.test/",
			webOrigin: "https://example.test",
			development: false,
		}),
	);
	const csp = headers["Content-Security-Policy"];
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain("base-uri 'self'");
	expect(csp).toContain("form-action 'self'");
	expect(csp).toContain(
		"connect-src 'self' https://api.example.test https://*.r2.cloudflarestorage.com",
	);
	expect(csp).toContain("upgrade-insecure-requests");
	expect(csp).not.toContain("unsafe-eval");
	expect(csp).not.toContain("ws:");
	expect(headers["X-Frame-Options"]).toBe("DENY");
	expect(headers["X-Content-Type-Options"]).toBe("nosniff");
	expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000");
});

test("local HTTP keeps development tooling and never pins HTTPS", () => {
	const headers = byName(
		securityHeaders({
			apiOrigin: "http://localhost:4000",
			webOrigin: "http://localhost:3000",
			development: true,
		}),
	);
	expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
	expect(headers["Content-Security-Policy"]).toContain("ws:");
	expect(headers["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
	expect(headers["Strict-Transport-Security"]).toBeUndefined();
});
