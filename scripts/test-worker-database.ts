import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const database = process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test";
const parsed = new URL(database);
if (
	!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
	parsed.pathname !== "/folio_test"
)
	throw new Error("Workers database tests require isolated local folio_test");
const root = new URL("../", import.meta.url);
const output = new URL("work/worker-database-regression/", root);
const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = require("miniflare");
const logs: string[] = [];
class CapturedLog extends Log {
	info(message: string) {
		logs.push(message);
	}
	warn(message: string) {
		logs.push(message);
	}
	error(error: Error) {
		logs.push(String(error));
	}
}
const child = Bun.spawn(
	[
		"bunx",
		"wrangler",
		"deploy",
		"tests/fixtures/worker-database.ts",
		"--config",
		"wrangler.toml",
		"--name",
		"local-worker-database-regression",
		"--dry-run",
		"--outdir",
		fileURLToPath(output),
	],
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
const [stdout, stderr] = await Promise.all([
	new Response(child.stdout).text(),
	new Response(child.stderr).text(),
]);
assert.equal(await child.exited, 0, `Local bundle failed: ${stdout}\n${stderr}`);
const mf = new Miniflare(
	convertV4MiniflareOptions({
		modules: true,
		modulesRoot: fileURLToPath(output),
		scriptPath: fileURLToPath(new URL("worker-database.js", output)),
		compatibilityDate: "2026-10-14",
		compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
		bindings: {
			NODE_ENV: "test",
			DATABASE_URL: database,
			BETTER_AUTH_SECRET: "synthetic-worker-database-test-value-at-least-32-characters",
			API_URL: "http://localhost:4000",
			WEB_URL: "http://localhost:3000",
		},
		log: new CapturedLog(LogLevel.ERROR),
		logRequests: false,
		handleStructuredLogs: (entry: { message: string }) => {
			logs.push(entry.message);
		},
	}),
);
/** Extracts the fixed event payload even when a runtime decorates console output. */
const events = () =>
	[...logs.join("\n").matchAll(/\{"event":"database_pool_error"[^}]*\}/g)].map(
		(match) =>
			JSON.parse(match[0]) as { code: string; stage: string; ending: boolean; ended: boolean },
	);
let passed = 0;
try {
	const origin = await mf.ready;
	const run = async (path: string) => {
		const response = await fetch(new URL(path, origin));
		assert.equal(response.status, 200);
		return response.json() as Promise<Record<string, unknown>>;
	};
	await run("/probe/normal");
	assert.equal(events().length, 0, "Successful request teardown must not emit a pool error");
	passed++;
	assert.equal((await run("/probe/transaction")).sameClient, true);
	assert.equal((await run("/probe/rollback")).reusableAfterRollback, true);
	assert.equal(events().length, 0, "Transactions and rollback must close cleanly");
	passed += 2;
	const concurrent = await Promise.all(Array.from({ length: 12 }, () => run("/probe/normal")));
	assert.equal(new Set(concurrent.map((result) => result.pid)).size, 12);
	assert.equal(events().length, 0, "Concurrent request scopes must close cleanly");
	passed++;
	assert.equal((await run("/probe/scheduled")).completed, true);
	assert.ok(logs.some((line) => line.includes('"event":"maintenance_completed"')));
	assert.equal(events().length, 0, "Scheduled teardown must close cleanly");
	passed++;
	await run("/probe/terminate");
	const failures = events();
	assert.ok(
		failures.some(
			(event) =>
				event.code === "57P01" && event.stage === "request" && !event.ending && !event.ended,
		),
		"Unexpected idle termination must remain an error before pool end",
	);
	assert.ok(
		failures.every((event) => event.code === "57P01"),
		"Only the intentional fault may emit pool errors",
	);
	passed++;
	await run("/probe/normal");
	assert.equal(events().length, failures.length, "Fresh request recovers without teardown errors");
	passed++;
	console.info(
		`${passed} Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.`,
	);
} finally {
	await mf.dispose();
}
