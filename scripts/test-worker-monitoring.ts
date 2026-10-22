import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("work/worker-monitoring/", root);
const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = require("miniflare");
const release = "11111111-2222-4333-8444-555555555555";
const privateValues = [
	"PRIVATE_DRAFT",
	"private@example.invalid",
	"203.0.113.77",
	"2001:db8::1234",
	"private-reset-token",
	"private-verification-token",
	"private-session-cookie",
	"private-auth-token",
];
const environment = {
	PATH: process.env.PATH,
	HOME: process.env.HOME,
	WRANGLER_WRITE_LOGS: "false",
	WRANGLER_SEND_METRICS: "false",
	CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
};
await Bun.write(new URL(".keep", output), "");
let passed = 0;
for (const worker of ["api", "web"] as const) {
	const manifest = Bun.TOML.parse(
		await Bun.file(new URL(`apps/${worker}/wrangler.toml`, root)).text(),
	);
	const config = {
		name: `local-${worker}-monitoring`,
		main: fileURLToPath(new URL(`apps/${worker}/tests/fixtures/worker-monitoring.ts`, root)),
		compatibility_date: manifest.compatibility_date,
		compatibility_flags: manifest.compatibility_flags,
		...(worker === "api"
			? {
					alias: {
						"#image-validation": fileURLToPath(
							new URL("apps/api/src/lib/storage/image-validation.worker.ts", root),
						),
						"@aws-sdk/xml-builder": "@aws-sdk/xml-builder/dist-cjs/index.js",
					},
				}
			: {}),
	};
	const configPath = new URL(`${worker}.json`, output);
	await Bun.write(configPath, JSON.stringify(config));
	const bundle = new URL(`${worker}/`, output);
	const child = Bun.spawn(
		[
			"bun",
			"--no-env-file",
			"x",
			"--no-install",
			"wrangler",
			"deploy",
			"--config",
			fileURLToPath(configPath),
			"--dry-run",
			"--outdir",
			fileURLToPath(bundle),
		],
		{
			cwd: fileURLToPath(new URL(`apps/${worker}/`, root)),
			env: environment,
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	assert.equal(await child.exited, 0, `${worker} fixture bundle failed: ${stdout}\n${stderr}`);
	for (const enabled of [false, true]) {
		const envelopes: string[] = [];
		let ingestionStatus = 200;
		const mf = new Miniflare(
			convertV4MiniflareOptions({
				modules: true,
				modulesRoot: fileURLToPath(bundle),
				scriptPath: fileURLToPath(new URL("worker-monitoring.js", bundle)),
				compatibilityDate: config.compatibility_date,
				compatibilityFlags: config.compatibility_flags,
				bindings: {
					NODE_ENV: "test",
					DATABASE_URL: "postgresql://folio@127.0.0.1:1/folio_test",
					BETTER_AUTH_SECRET: "synthetic-monitoring-test-secret-at-least-32-characters",
					API_URL: "https://api.example.invalid",
					WEB_URL: "https://web.example.invalid",
					CF_VERSION_METADATA: { id: release },
					// Synthetic SDK test DSN only. No real project or credential is used.
					...(enabled ? { SENTRY_DSN: "https://synthetic@o0.ingest.sentry.io/1" } : {}),
				},
				log: new Log(LogLevel.NONE),
				logRequests: false,
				/** Every outbound fetch is intercepted; no Sentry, Neon or provider request is possible. */
				outboundService: {
					node: async (request: IncomingMessage, response: ServerResponse) => {
						assert.equal(request.headers.host, "o0.ingest.sentry.io");
						assert.equal(request.method, "POST");
						assert.ok(request.url?.startsWith("/api/1/envelope/"));
						const chunks: Buffer[] = [];
						for await (const chunk of request) chunks.push(Buffer.from(chunk));
						envelopes.push(Buffer.concat(chunks).toString());
						response.writeHead(ingestionStatus, { "Content-Type": "application/json" });
						response.end("{}");
					},
				},
			}),
		);
		try {
			const origin = await mf.ready;
			const run = async (path: string, expected: number, method = "POST") => {
				const response = await fetch(
					new URL(`${path}?token=private-reset-token&verify=private-verification-token`, origin),
					{
						method,
						headers: {
							Cookie: "session=private-session-cookie",
							Authorization: "Bearer private-auth-token",
							"Content-Type": "application/json",
							"X-Forwarded-For": "203.0.113.77",
						},
						...(method === "POST"
							? { body: JSON.stringify({ draft: privateValues.join(" ") }) }
							: {}),
					},
				);
				assert.equal(response.status, expected, `${worker} ${path}`);
				await response.text();
			};
			for (const status of [200, 400, 401, 403, 404, 422, 429]) await run(`/${status}`, status);
			await run("/throw-403", 500);
			assert.equal(envelopes.length, 0, "Expected 4xx must not be sent");
			passed++;
			for (const path of ["/throw", "/500", "/503"]) await run(path, path === "/503" ? 503 : 500);
			if (worker === "api") {
				await run("/cron-ok", 200);
				await run("/cron-fail", 500);
				const response = await fetch(new URL("/health", origin));
				assert.equal(
					response.status,
					200,
					"Production health must not connect to unavailable database port 1",
				);
				await response.text();
			} else await run("/next-error", 500);
			if (!enabled) {
				for (const method of ["HEAD", "OPTIONS"]) await run("/503", 503, method);
				assert.equal(envelopes.length, 0, "Missing DSN must produce zero external traffic");
				passed++;
				continue;
			}
			assert.equal(
				envelopes.length,
				4,
				`${worker}: unhandled, two 5xx, and Cron/Next error exactly once`,
			);
			const events = envelopes.map((raw) => {
				for (const privateValue of privateValues)
					assert.ok(!raw.includes(privateValue), "Whole envelope must be private");
				const lines = raw.split("\n");
				assert.equal(
					JSON.parse(lines[1]).type,
					"event",
					"Only error events, no spans/logs/check-ins",
				);
				const event = JSON.parse(lines[2]);
				assert.equal(event.environment, "trial");
				assert.equal(event.release, release);
				assert.equal(event.tags.worker, worker);
				assert.equal(event.level, "error");
				assert.equal(event.request, undefined);
				assert.equal(event.user, undefined);
				return event;
			});
			assert.equal(events.filter((event) => event.tags.kind === "http_5xx").length, 2);
			assert.equal(
				events.filter(
					(event) => event.tags.kind === (worker === "api" ? "cron_failed" : "unhandled"),
				).length,
				worker === "api" ? 1 : 2,
			);
			passed += 4;
			for (const method of ["HEAD", "OPTIONS"]) {
				const previous = envelopes.length;
				await run("/403", 403, method);
				await run("/503", 503, method);
				await run("/throw", 500, method);
				assert.equal(
					envelopes.length - previous,
					2,
					`${worker}: ${method} captures only server failures`,
				);
				for (const raw of envelopes.slice(previous))
					for (const value of privateValues) assert.ok(!raw.includes(value));
				passed++;
			}
			ingestionStatus = 503;
			const previous = envelopes.length;
			await run("/503", 503);
			assert.equal(
				envelopes.length,
				previous + 1,
				"Ingestion failure neither rewrites the application response nor retries",
			);
			passed++;
		} finally {
			await mf.dispose();
		}
	}
}
if (process.argv.includes("--web-built")) {
	const bundle = new URL("web-built/", output);
	const child = Bun.spawn(
		[
			"bun",
			"--no-env-file",
			"x",
			"--no-install",
			"wrangler",
			"deploy",
			"--config",
			"wrangler.toml",
			"--dry-run",
			"--outdir",
			fileURLToPath(bundle),
		],
		{
			cwd: fileURLToPath(new URL("apps/web/", root)),
			env: environment,
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	assert.equal(await child.exited, 0, `Actual web bundle failed: ${stdout}\n${stderr}`);
	for (const enabled of [false, true]) {
		const envelopes: string[] = [];
		let apiRequests = 0;
		const mf = new Miniflare(
			convertV4MiniflareOptions({
				modules: true,
				modulesRoot: fileURLToPath(bundle),
				scriptPath: fileURLToPath(new URL("worker.js", bundle)),
				compatibilityDate: "2026-10-14",
				compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
				assets: {
					directory: fileURLToPath(new URL("apps/web/.open-next/assets/", root)),
					binding: "ASSETS",
					run_worker_first: true,
					routerConfig: { has_user_worker: true },
				},
				bindings: {
					API_URL: "https://api.lord2ve.tech",
					CF_VERSION_METADATA: { id: release },
					...(enabled ? { SENTRY_DSN: "https://synthetic@o0.ingest.sentry.io/1" } : {}),
				},
				log: new Log(LogLevel.NONE),
				logRequests: false,
				outboundService: {
					node: async (request: IncomingMessage, response: ServerResponse) => {
						if (request.headers.host === "o0.ingest.sentry.io") {
							const chunks: Buffer[] = [];
							for await (const chunk of request) chunks.push(Buffer.from(chunk));
							envelopes.push(Buffer.concat(chunks).toString());
							response.writeHead(200, { "Content-Type": "application/json" });
							response.end("{}");
							return;
						}
						assert.equal(
							request.headers.host,
							"api.lord2ve.tech",
							"Unexpected outbound request blocked",
						);
						apiRequests++;
						response.writeHead(503, { "Content-Type": "application/json" });
						response.end(JSON.stringify({ status: false, code: "SYNTHETIC_UNAVAILABLE" }));
					},
				},
			}),
		);
		try {
			const origin = await mf.ready;
			for (const path of ["/health", "/en"]) {
				const response = await fetch(new URL(path, origin));
				if (response.status !== 200)
					await Bun.write(new URL("web-error.html", output), await response.clone().text());
				assert.equal(response.status, 200, `Built web ${path}`);
				await response.text();
			}
			assert.equal(
				apiRequests,
				0,
				"Web health and prerendered monitor must not touch API/database",
			);
			assert.equal(envelopes.length, 0);
			passed++;
			const missing = await fetch(new URL("/en/does-not-exist", origin));
			assert.equal(missing.status, 404);
			await missing.text();
			assert.equal(envelopes.length, 0);
			passed++;
			const failed = await fetch(
				new URL("/p/local-monitoring-fixture?token=private-reset-token", origin),
				{
					headers: {
						Cookie: "session=private-session-cookie",
						Authorization: "Bearer private-auth-token",
					},
				},
			);
			assert.equal(failed.status, 500);
			await failed.text();
			const deadline = Date.now() + 5000;
			while (enabled && envelopes.length === 0 && Date.now() < deadline) await Bun.sleep(20);
			assert.equal(
				envelopes.length,
				enabled ? 1 : 0,
				"Actual Next failure must be captured exactly once",
			);
			assert.ok(apiRequests > 0, "Failure was induced by the mocked API");
			for (const raw of envelopes) {
				for (const value of [...privateValues, "local-monitoring-fixture"])
					assert.ok(!raw.includes(value));
				const event = JSON.parse(raw.split("\n")[2] ?? "{}");
				assert.equal(event.tags.worker, "web");
				assert.equal(event.environment, "trial");
				assert.equal(event.release, release);
			}
			passed += 2;
		} finally {
			await mf.dispose();
		}
	}
}
console.info(
	`${passed} Workers monitoring checks passed; all ingestion mocked; no external provider/database traffic.`,
);
