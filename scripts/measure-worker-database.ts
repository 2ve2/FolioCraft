import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { withLocalStatementTimeout } from "./local-statement-timeout";

// This exercises native sessions with synthetic local accounts, never a hosted database.
const database = process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test";
const parsed = new URL(database);
if (
	parsed.protocol !== "postgresql:" ||
	!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
	parsed.pathname !== "/folio_test" ||
	parsed.search ||
	parsed.hash
)
	throw new Error("Latency measurements require local disposable folio_test without overrides");
const root = new URL("../", import.meta.url);
const label = process.argv.find((arg) => arg.startsWith("--label="))?.slice(8) ?? "local";
assert.match(label, /^[a-z-]{1,32}$/);
const bound = process.argv.includes("--binding");
const bindingDatabase = new URL(database);
if (!bindingDatabase.password) bindingDatabase.password = "synthetic-local-only";
bindingDatabase.searchParams.set("options", "-c statement_timeout=15000");
const output = new URL(`work/database-latency/${label}/`, root);
const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = require("miniflare");
const { Pool } = createRequire(new URL("apps/api/package.json", root))("pg");
const logs: string[] = [];
class SilentLog extends Log {
	info() {}
	warn() {}
	error() {}
}
const child = Bun.spawn(
	["bunx", "--no-install", "wrangler", "deploy", "--dry-run", "--outdir", fileURLToPath(output)],
	{
		cwd: fileURLToPath(new URL("apps/api/", root)),
		env: {
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			WRANGLER_WRITE_LOGS: "false",
			WRANGLER_SEND_METRICS: "false",
			CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
		},
		stdout: "pipe",
		stderr: "pipe",
	},
);
await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
assert.equal(await child.exited, 0, "Local Worker build must succeed");
await withLocalStatementTimeout(database, async () => {
	const mf = new Miniflare(
		convertV4MiniflareOptions({
			modules: true,
			modulesRoot: fileURLToPath(output),
			scriptPath: fileURLToPath(new URL("worker.js", output)),
			compatibilityDate: "2026-10-14",
			compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
			bindings: {
				NODE_ENV: "test",
				DATABASE_URL: database,
				BETTER_AUTH_SECRET: "synthetic-local-latency-test-value-at-least-32-characters",
				ADMIN_REQUIRE_MFA: "false",
				API_URL: "http://localhost:4000",
				WEB_URL: "http://localhost:3000",
				DB_TIMING_LOGS: "true",
			},
			...(bound ? { hyperdrives: { HYPERDRIVE: bindingDatabase.href } } : {}),
			log: new SilentLog(LogLevel.ERROR),
			logRequests: false,
			handleStructuredLogs: (entry: { message: string }) => logs.push(entry.message),
		}),
	);
	const control = new Pool({ connectionString: database, max: 1 });
	const email = `latency-${crypto.randomUUID()}@example.com`;
	let cookie = "";
	try {
		const origin = await mf.ready;
		const request = async (path: string, method = "GET", body?: unknown) => {
			const response = await fetch(new URL(path, origin), {
				method,
				headers: {
					Origin: "http://localhost:3000",
					"Content-Type": "application/json",
					Cookie: cookie,
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			assert.equal(response.status, 200, `Unexpected status for ${method} ${path}`);
			return response;
		};
		const signup = await request("/api/auth/sign-up/email", "POST", {
			email,
			password: `Synthetic-${crypto.randomUUID()}-aA1!`,
			name: "Latency fixture",
		});
		cookie = signup.headers
			.getSetCookie()
			.map((value) => value.split(";")[0])
			.join("; ");
		assert.ok(cookie);
		const slug = `latency-${crypto.randomUUID()}`;
		let site = (await (await request("/api/sites", "POST", { slug, locale: "en" })).json()).result;
		site.draft.profile.name = "Synthetic portfolio";
		site.draft.profile.role = "Latency fixture";
		site = (
			await (
				await request(`/api/sites/${site.id}/draft`, "PUT", {
					revision: site.revision,
					draft: site.draft,
				})
			).json()
		).result;
		await request(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision });
		const samples: Record<string, Record<string, number>[]> = {
			public: [],
			session: [],
			studio: [],
		};
		const paths = {
			public: `/api/public/sites/${slug}`,
			session: "/api/me",
			studio: `/api/sites/${site.id}`,
		};
		for (let i = 0; i < 35; i++) {
			for (const [kind, path] of Object.entries(paths)) {
				const started = performance.now();
				const response = await request(path);
				await response.arrayBuffer();
				const totalMs = performance.now() - started;
				const id = response.headers.get("x-request-id");
				const deadline = Date.now() + 5000;
				let metric:
					| {
							requestId: string;
							queryErrors: number;
							connectionMs: number;
							queryMs: number;
							queries: number;
					  }
					| undefined;
				while (!metric && Date.now() < deadline) {
					metric = logs
						.flatMap((line) => [...line.matchAll(/\{"event":"database_timing"[^}]*\}/g)])
						.map((match) => JSON.parse(match[0]))
						.find((event) => event.requestId === id);
					if (!metric) await Bun.sleep(5);
				}
				assert.ok(metric, "Expected correlated database timing");
				assert.equal(metric.queryErrors, 0);
				if (i >= 5)
					samples[kind].push({
						totalMs,
						connectionMs: metric.connectionMs,
						queryMs: metric.queryMs,
						queries: metric.queries,
					});
			}
		}
		const summary = Object.fromEntries(
			Object.entries(samples).map(([kind, rows]) => [
				kind,
				Object.fromEntries(
					Object.keys(rows[0]).map((key) => {
						const values = rows.map((row) => row[key]).sort((a, b) => a - b);
						return [key, { median: +values[14].toFixed(2), p95: +values[28].toFixed(2) }];
					}),
				),
			]),
		);
		const result = {
			label,
			transport: bound ? "local-binding-direct-postgres-not-real-hyperdrive" : "direct",
			samplesPerEndpoint: 30,
			summary,
		};
		await Bun.write(
			new URL(`work/database-latency/${label}.json`, root),
			JSON.stringify({ ...result, samples }, null, 2),
		);
		console.info(JSON.stringify(result));
	} finally {
		const removed = await control.query('delete from "user" where email = $1', [email]);
		console.info(`Synthetic local account cleanup: ${removed.rowCount} removed`);
		await control.end();
		await mf.dispose();
	}
});
