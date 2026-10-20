import "./test-guard";
import { expect, test } from "bun:test";
import { Hono } from "hono";
import { mailRequestId } from "../src/lib/auth/mail-context";
import type { AuthEnv } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/error-handler";
import { registerHttpMiddleware } from "../src/middleware/http";

test("mail diagnostics correlate isolated server-generated IDs instead of caller headers", async () => {
	const app = new Hono<AuthEnv>();
	registerHttpMiddleware(app);
	app.get("/correlation", async (c) => {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return c.json({ id: mailRequestId() });
	});
	const responses = await Promise.all(
		Array.from({ length: 4 }, () =>
			app.request("/correlation", {
				headers: { "X-Request-Id": "untrusted-private-header" },
			}),
		),
	);
	const ids = new Set<string>();
	for (const response of responses) {
		const { id } = (await response.json()) as { id: string };
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(response.headers.get("X-Request-Id")).toBe(id);
		ids.add(id);
	}
	expect(ids.size).toBe(4);
});

test("only successful published asset redirects allow cross-origin image embedding", async () => {
	const app = new Hono<AuthEnv>();
	registerHttpMiddleware(app);
	const assets = new Hono();
	assets.get("/:slug/assets/:assetId", (c) =>
		c.req.param("assetId") === "visible"
			? c.redirect("https://example.com/public-image.png", 302)
			: c.json({ code: "NOT_FOUND" }, 404),
	);
	app.route("/api/public/sites", assets);
	app.get("/api/sites/private/assets/visible", (c) => c.redirect("https://example.com", 302));
	app.get("/api/public/sites/example", (c) => c.json({ status: true }));
	for (const method of ["GET", "HEAD"]) {
		const published = await app.request("/api/public/sites/example/assets/visible", { method });
		expect(published.status).toBe(302);
		expect(published.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
		expect(published.headers.get("Cache-Control")).toBe("no-store");
	}
	for (const path of [
		"/api/public/sites/example/assets/denied",
		"/api/sites/private/assets/visible",
		"/api/public/sites/example",
	]) {
		const response = await app.request(path);
		expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
	}
});

test("database DNS and stalled-read failures return recoverable503 without internal details", async () => {
	for (const code of ["ETIMEOUT", "ENOTFOUND", "EAI_AGAIN", "57014"]) {
		const app = new Hono();
		app.onError(errorHandler);
		app.get("/failure", () => {
			throw Object.assign(new Error("private database detail"), { cause: { code } });
		});
		const response = await app.request("/failure");
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			status: false,
			error: "Database unavailable",
			code: "DATABASE_UNAVAILABLE",
		});
	}
	for (const error of [
		new Error("Query read timeout"),
		new Error("Drizzle query failed", { cause: new Error("Query read timeout") }),
	]) {
		const app = new Hono();
		app.onError(errorHandler);
		app.get("/failure", () => {
			throw error;
		});
		expect((await app.request("/failure")).status).toBe(503);
	}
});
