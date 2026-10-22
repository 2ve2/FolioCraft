import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const require = createRequire(resolve(root, "package.json"));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = createRequire(
	require.resolve("wrangler"),
)("miniflare");
const script = resolve(root, "work/database-latency/service-api/worker.js");
const database = process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test";
const parsed = new URL(database);
if (
	parsed.protocol !== "postgresql:" ||
	!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
	parsed.pathname !== "/folio_test" ||
	parsed.search ||
	parsed.hash
)
	throw new Error("Service comparison requires local disposable folio_test without overrides");

class Silent extends Log {
	info() {}
	warn() {}
	error() {}
}
const build = Bun.spawn(
	[
		"bunx",
		"--no-install",
		"wrangler",
		"deploy",
		"--dry-run",
		"--outdir",
		resolve(root, "work/database-latency/service-api"),
	],
	{
		cwd: resolve(root, "apps/api"),
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
await Promise.all([new Response(build.stdout).text(), new Response(build.stderr).text()]);
assert.equal(await build.exited, 0, "Local API bundle must succeed");
const mf = new Miniflare(
	convertV4MiniflareOptions({
		workers: [
			{
				name: "api",
				modules: true,
				scriptPath: script,
				modulesRoot: resolve(root, "work/database-latency/service-api"),
				compatibilityDate: "2026-10-14",
				compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
				bindings: {
					NODE_ENV: "test",
					DATABASE_URL: database,
					BETTER_AUTH_SECRET: "synthetic-local-only-at-least-32-characters",
					ADMIN_REQUIRE_MFA: "false",
					API_URL: "http://localhost:4000",
					WEB_URL: "http://localhost:3000",
				},
			},
			{
				name: "probe",
				modules: true,
				script: `export default {async fetch(request,env) {const u=new URL(request.url); const target=u.searchParams.get('target'); const start=performance.now(); const response=await (u.pathname==='/binding'?env.API.fetch(target):fetch(target)); await response.arrayBuffer(); return Response.json({status:response.status,durationMs:performance.now()-start});}}`,
				compatibilityDate: "2026-10-14",
				serviceBindings: { API: "api" },
			},
		],
		log: new Silent(LogLevel.ERROR),
		logRequests: false,
		handleStructuredLogs: () => {},
	}),
);
const email = `latency-${crypto.randomUUID()}@example.com`;
const { Pool } = createRequire(resolve(root, "apps/api/package.json"))("pg");
const db = new Pool({ connectionString: database, max: 1 });
try {
	const origin = await mf.ready;
	let cookie = "";
	const req = async (path: string, method = "GET", body?: unknown) => {
		const r = await fetch(new URL(path, origin), {
			method,
			headers: {
				Origin: "http://localhost:3000",
				"Content-Type": "application/json",
				Cookie: cookie,
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		assert.equal(r.status, 200);
		return r;
	};
	const signup = await req("/api/auth/sign-up/email", "POST", {
		email,
		password: `Synthetic-${crypto.randomUUID()}`,
		name: "Service measurement",
	});
	cookie = signup.headers
		.getSetCookie()
		.map((s: string) => s.split(";")[0])
		.join("; ");
	const slug = `latency-${crypto.randomUUID()}`;
	let site = (await (await req("/api/sites", "POST", { slug, locale: "en" })).json()).result;
	site.draft.profile.name = "Synthetic";
	site.draft.profile.role = "Measurement";
	site = (
		await (
			await req(`/api/sites/${site.id}/draft`, "PUT", {
				revision: site.revision,
				draft: site.draft,
			})
		).json()
	).result;
	await req(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision });
	const probe = await mf.getWorker("probe");
	const target = new URL(`/api/public/sites/${slug}`, origin).href;
	const samples: Record<string, number[]> = { http: [], binding: [] };
	for (let i = 0; i < 35; i++) {
		for (const kind of i % 2 ? ["binding", "http"] : ["http", "binding"]) {
			const r = await probe.fetch(`https://probe/${kind}?target=${encodeURIComponent(target)}`);
			const d = await r.json();
			assert.equal(d.status, 200);
			if (i >= 5) samples[kind].push(d.durationMs);
		}
	}
	const summary = Object.fromEntries(
		Object.entries(samples).map(([k, v]) => {
			v.sort((a, b) => a - b);
			return [k, { median: v[14], p95: v[28] }];
		}),
	);
	console.log(
		JSON.stringify({
			kind: "local-workerd-api-subrequest-only-not-page-or-edge",
			samples: 30,
			summary,
		}),
	);
	await Bun.write(
		resolve(root, "work/database-latency/service-binding.json"),
		JSON.stringify({ summary, samples }, null, 2),
	);
} finally {
	console.log(
		`Synthetic local account cleanup: ${(await db.query('delete from "user" where email=$1', [email])).rowCount} removed`,
	);
	await db.end();
	await mf.dispose();
}
