import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("work/worker-mail-regression/", root);
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
// Never load ignored project credentials during bundling or local execution.
const child = Bun.spawn(
	[
		"bunx",
		"wrangler",
		"deploy",
		"tests/fixtures/worker-mail.ts",
		"--config",
		"wrangler.toml",
		"--name",
		"local-worker-mail-regression",
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
const buildOutput = await new Response(child.stdout).text();
const buildErrors = await new Response(child.stderr).text();
assert.equal(await child.exited, 0, `Local bundle failed: ${buildOutput}\n${buildErrors}`);
const counts = new Map<string, number>();
let entered = () => {};
let release = () => {};
const providerEntered = new Promise<void>((resolve) => {
	entered = resolve;
});
const providerReleased = new Promise<void>((resolve) => {
	release = resolve;
});
const key = "synthetic-key-never-log";
const mf = new Miniflare(
	convertV4MiniflareOptions({
		modules: true,
		modulesRoot: fileURLToPath(output),
		scriptPath: fileURLToPath(new URL("worker-mail.js", output)),
		compatibilityDate: "2026-10-14",
		compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
		bindings: {
			NODE_ENV: "test",
			DATABASE_URL: "postgresql://folio@127.0.0.1:55432/folio_test",
			BETTER_AUTH_SECRET: "synthetic-worker-auth-secret-at-least-32-characters",
			API_URL: "https://api.example.invalid",
			WEB_URL: "https://web.example.invalid",
			SMTP_HOST: "smtp.resend.com",
			SMTP_USER: "resend",
			SMTP_PASSWORD: key,
			MAIL_FROM: "sender@example.invalid",
			MAIL_TRANSPORT: "resend_http",
		},
		log: new CapturedLog(LogLevel.ERROR),
		logRequests: false,
		handleStructuredLogs: (entry: { message: string }) => {
			logs.push(entry.message);
		},
		/** Intercepts every outbound request; the runtime cannot contact Resend or a database. */
		outboundService: {
			node: async (request: IncomingMessage, response: ServerResponse) => {
				assert.equal(request.url, "/emails");
				assert.equal(request.headers.host, "api.resend.com");
				assert.equal(request.method, "POST");
				assert.equal(request.headers.authorization, `Bearer ${key}`);
				const chunks: Buffer[] = [];
				for await (const chunk of request) chunks.push(Buffer.from(chunk));
				const payload = JSON.parse(Buffer.concat(chunks).toString()) as {
					to: string;
					html: string;
					text: string;
					subject: string;
					from: string;
				};
				const scenario = payload.to.split("@")[0];
				counts.set(scenario, (counts.get(scenario) ?? 0) + 1);
				assert.equal(payload.from, "Ichnara <sender@example.invalid>");
				assert.match(payload.text, /private-token|reset-password/);
				if (!scenario.startsWith("native-")) {
					assert.ok(payload.html.includes("&lt;synthetic-name&gt;&amp;&quot;"));
					assert.ok(!payload.html.includes("<synthetic-name>"));
				}
				assert.ok(
					payload.subject.includes(
						scenario === "verify" ? "Verify your email" : "Reset your password",
					),
				);
				if (scenario === "native-success") {
					entered();
					await providerReleased;
				}
				if (["forbidden", "limited", "server-error", "native-failure"].includes(scenario)) {
					const status = scenario === "limited" ? 429 : scenario === "server-error" ? 500 : 403;
					response.writeHead(status, { "Content-Type": "application/json" });
					response.end(
						JSON.stringify({
							message: `${key} ${payload.to} private-token https://private.invalid/`,
						}),
					);
					return;
				}
				if (scenario === "redirect") {
					response.writeHead(307, { Location: "https://outside.invalid/" });
					response.end();
					return;
				}
				if (scenario === "network") {
					response.destroy();
					return;
				}
				if (scenario === "timeout") {
					await new Promise((resolve) => setTimeout(resolve, 16000));
				}
				response.writeHead(200, { "Content-Type": "application/json" });
				response.end(
					scenario === "invalid-json"
						? "not-json"
						: JSON.stringify(scenario === "missing-id" ? {} : { id: "synthetic-accepted-id" }),
				);
			},
		},
	}),
);
/** Structured logs reach the host on their own channel and can trail the HTTP response. */
async function waitForLog(match: (line: string) => boolean, label: string) {
	const deadline = Date.now() + 5000;
	while (!logs.some(match)) {
		if (Date.now() > deadline) assert.fail(`Missing correlated log: ${label}`);
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}
let passed = 0;
try {
	const origin = await mf.ready;
	const run = async (scenario: string) => {
		const response = await fetch(new URL(scenario, origin));
		assert.equal(response.status, 200);
		return (await response.json()) as {
			accepted?: boolean;
			status?: number;
			body?: { status: boolean };
			requestId: string;
		};
	};
	for (const [scenario, code] of [
		["success", null],
		["verify", null],
		["forbidden", "HTTP_403"],
		["limited", "HTTP_429"],
		["server-error", "HTTP_500"],
		["invalid-json", "INVALID_RESPONSE"],
		["missing-id", "INVALID_RESPONSE"],
		["network", "NETWORK_ERROR"],
		["redirect", "HTTP_307"],
		["timeout", "TIMEOUT"],
		["invalid-link", "INVALID_LINK"],
	] as const) {
		const result = await run(scenario);
		assert.equal(result.accepted, code === null, scenario);
		assert.equal(
			counts.get(scenario) ?? 0,
			scenario === "invalid-link" ? 0 : 1,
			"No retries or invalid-origin sends",
		);
		const event = code === null ? "auth_mail_accepted" : "auth_mail_failed";
		await waitForLog(
			(line) =>
				line.includes(result.requestId) &&
				line.includes(event) &&
				(!code || line.includes(`"code":"${code}"`)),
			scenario,
		);
		passed++;
	}
	let completed = false;
	const pending = run("native-success").then((result) => {
		completed = true;
		return result;
	});
	await Promise.race([
		providerEntered,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Native callback did not reach mock")), 10000),
		),
	]);
	await new Promise((resolve) => setTimeout(resolve, 100));
	assert.equal(completed, false, "Native reset must await provider completion");
	release();
	assert.equal((await pending).body?.status, true);
	passed++;
	const failed = await run("native-failure");
	assert.equal(failed.status, 200);
	assert.equal(
		failed.body?.status,
		true,
		"Native helper preserves generic success after callback failure",
	);
	await waitForLog(
		(line) => line.includes(failed.requestId) && line.includes('"code":"HTTP_403"'),
		"native-failure",
	);
	passed++;
	const unknown = await run("native-unknown");
	assert.equal(unknown.body?.status, true);
	assert.equal(counts.has("native-unknown"), false, "Unknown recipient does not invoke transport");
	passed++;
	// Let any trailing log lines arrive before checking that none of them leak private values.
	await new Promise((resolve) => setTimeout(resolve, 500));
	const combined = logs.join("\n");
	for (const privateValue of [
		key,
		"@example.invalid",
		"private-token",
		"private.invalid",
		"Bearer ",
		"synthetic-name",
		"synthetic-accepted-id",
	])
		assert.ok(
			!combined.includes(privateValue),
			"Mail logs must exclude private fields and provider bodies",
		);
	passed++;
	console.info(
		`${passed} Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.`,
	);
} finally {
	release();
	await mf.dispose();
}
