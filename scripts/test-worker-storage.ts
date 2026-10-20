import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("work/worker-storage-regression/", root);
const wrangler = import.meta.resolve("wrangler");
const require = createRequire(wrangler);
// Wrangler pins this local runtime; no global installation or live provider is used.
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = require("miniflare");
const child = Bun.spawn(
	[
		"bunx",
		"wrangler",
		"deploy",
		"tests/fixtures/worker-storage.ts",
		"--config",
		"wrangler.toml",
		"--name",
		"local-worker-storage-regression",
		"--dry-run",
		"--outdir",
		fileURLToPath(output),
	],
	{
		cwd: fileURLToPath(new URL("apps/api/", root)),
		env: { ...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_SEND_METRICS: "false" },
		stdout: "inherit",
		stderr: "inherit",
	},
);
assert.equal(await child.exited, 0, "Workers regression bundle must build");
const mf = new Miniflare(
	convertV4MiniflareOptions({
		modules: true,
		modulesRoot: fileURLToPath(output),
		scriptPath: fileURLToPath(new URL("worker-storage.js", output)),
		compatibilityDate: "2026-10-14",
		compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
		log: new Log(LogLevel.ERROR),
	}),
);
try {
	// Native fetch avoids Bun's incompatibility with Undici's custom dispatchers.
	const response = await fetch(await mf.ready);
	assert.equal(response.status, 200);
	const evidence = (await response.json()) as {
		domParserAbsent: boolean;
		results: { name: string; pass: boolean }[];
	};
	assert.equal(evidence.domParserAbsent, true, "Regression must execute without a DOM polyfill");
	assert.equal(evidence.results.length, 6);
	for (const result of evidence.results) {
		assert.equal(result.pass, true, result.name);
		console.info(`PASS Workers storage XML: ${result.name}`);
	}
	console.info("6 Workers storage regressions passed; no provider/database requests.");
} finally {
	await mf.dispose();
}
