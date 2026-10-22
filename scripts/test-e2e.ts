import { cp, mkdir, rm, symlink } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";

// Never inherit provider configuration or load a development/production .env.
const database = process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test";
const parsed = new URL(database);
if (
	parsed.protocol !== "postgresql:" ||
	!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
	parsed.pathname !== "/folio_test" ||
	parsed.search ||
	parsed.hash
) {
	throw new Error("E2E requires local disposable folio_test without connection overrides");
}
const root = resolve(import.meta.dir, "..");
const runtime = resolve(root, "work/e2e-runtime");
const web = "http://127.0.0.1:4300";
const api = "http://127.0.0.1:4400";
const temporary = resolve(root, "work/e2e-tmp");
const environment: Record<string, string> = {
	TMPDIR: temporary,
	PATH: process.env.PATH ?? "",
	HOME: process.env.HOME ?? "",
	...(process.env.CI ? { CI: "true" } : {}),
	...(process.env.PLAYWRIGHT_BROWSERS_PATH
		? { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH }
		: {}),
	DATABASE_URL: database,
	TEST_DATABASE_URL: database,
	NODE_ENV: "test",
	BETTER_AUTH_SECRET: "isolated-e2e-only-at-least-32-characters-never-production",
	REPORT_IP_SALT: "isolated-e2e-report-salt-never-production",
	ADMIN_REQUIRE_MFA: "true",
	TRIAL_SKIP_EMAIL_VERIFICATION: "false",
	API_URL: api,
	WEB_URL: web,
	NEXT_PUBLIC_API_URL: api,
	NEXT_PUBLIC_WEB_URL: web,
	NEXT_TELEMETRY_DISABLED: "1",
	PORTFOLIO_REVALIDATION_SECRET: "isolated-public-cache-e2e-at-least-32-characters",
	PORTFOLIO_REVALIDATION_URL: "http://127.0.0.1:4301/api/internal/revalidate-portfolio",
	PORT: "4400",
	HOST: "127.0.0.1",
};
const services: ReturnType<typeof Bun.spawn>[] = [];

/** Rejects occupied ports rather than reusing an unrelated server or its database. */
async function assertFree(port: number) {
	await new Promise<void>((accept, reject) => {
		const server = createServer();
		server.once("error", () => reject(new Error(`E2E port ${port} is already occupied`)));
		server.listen(port, "127.0.0.1", () => server.close(() => accept()));
	});
}

/** Executes a checked child with only the isolated configuration above. */
async function run(command: string[], cwd = root, env = environment) {
	const child = Bun.spawn(command, { cwd, env, stdout: "inherit", stderr: "inherit" });
	services.push(child);
	if ((await child.exited) !== 0)
		throw new Error(`E2E command failed: ${command[0]} ${command[1]}`);
}

/** Waits for real readiness, failing immediately if the owned service exits. */
async function ready(url: string, child: ReturnType<typeof Bun.spawn>) {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) throw new Error("E2E service exited before readiness");
		try {
			if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
		} catch {}
		await Bun.sleep(100);
	}
	throw new Error(`E2E readiness timeout: ${url}`);
}

/** Terminates only processes started by this invocation. */
async function stop() {
	for (const child of services.toReversed()) {
		if (child.exitCode !== null) continue;
		child.kill("SIGTERM");
		await Promise.race([child.exited, Bun.sleep(3000)]);
		if (child.exitCode === null) child.kill("SIGKILL");
		await child.exited;
	}
}
for (const signal of ["SIGTERM", "SIGINT"] as const)
	process.on(signal, async () => {
		await stop();
		process.exit(1);
	});

try {
	await mkdir(temporary, { recursive: true });
	await assertFree(4300);
	await assertFree(4400);
	await assertFree(4301);
	await run(["bun", "--no-env-file", "src/db/migrate.ts"], resolve(root, "apps/api"));
	// Next loads .env files itself. Build a source-only web copy with no ignored environment files.
	await rm(runtime, { recursive: true, force: true });
	await mkdir(resolve(runtime, "apps"), { recursive: true });
	for (const name of [
		"package.json",
		"bun.lock",
		"packages/contracts/package.json",
		"packages/contracts/src",
		"packages/portfolio/package.json",
		"packages/portfolio/src",
		"apps/web/package.json",
		"apps/web/src",
		"apps/web/public",
		"apps/web/next.config.ts",
		"apps/web/tsconfig.json",
	]) {
		await cp(resolve(root, name), resolve(runtime, name), {
			recursive: true,
			filter: (path) =>
				!path
					.slice(resolve(root, name).length)
					.split("/")
					.some((part) =>
						/^(node_modules|\.next.*|\.open-next|\.wrangler|work|\.(?:env|dev\.vars)(?:\..*)?)$/.test(
							part,
						),
					),
		});
	}
	await symlink(resolve(root, "node_modules"), resolve(runtime, "node_modules"), "dir");
	await symlink(
		resolve(root, "apps/web/node_modules"),
		resolve(runtime, "apps/web/node_modules"),
		"dir",
	);
	const production = { ...environment, NODE_ENV: "production" };
	const webDirectory = resolve(runtime, "apps/web");
	const next = resolve(root, "apps/web/node_modules/next/dist/bin/next");
	await run(["node", next, "build", "--webpack"], webDirectory, production);
	await run(["bun", "--no-env-file", "e2e/seed.ts", "--wait-budget"]);
	const backend = Bun.spawn(["bun", "--no-env-file", "src/server.ts"], {
		cwd: resolve(root, "apps/api"),
		env: environment,
		stdout: "inherit",
		stderr: "inherit",
	});
	services.push(backend);
	await ready(`${api}/ready`, backend);
	const frontend = Bun.spawn(["node", next, "start", "--hostname", "127.0.0.1", "--port", "4301"], {
		cwd: webDirectory,
		env: production,
		stdout: "inherit",
		stderr: "inherit",
	});
	services.push(frontend);
	await ready("http://127.0.0.1:4301/en/login", frontend);
	const proxy = Bun.spawn(["bun", "--no-env-file", "scripts/local-public-cache-proxy.ts"], {
		cwd: root,
		env: environment,
		stdout: "inherit",
		stderr: "inherit",
	});
	services.push(proxy);
	await ready(`${web}/en/login`, frontend);
	await run([
		"node",
		resolve(root, "node_modules/@playwright/test/cli.js"),
		"test",
		"--config=e2e/playwright.config.ts",
		...process.argv.slice(2),
	]);
} finally {
	await stop();
}
