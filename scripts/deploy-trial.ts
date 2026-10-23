// One command for the human-operated trial release: checks the checkout, builds the web app with the
// public origins, deploys the API before the web, then checks both public endpoints. It never reads
// or prints secrets, never runs migrations and never changes Cloudflare resources or secrets.
//
//   bun run deploy:trial            deploy with the mode last used (normal on first run)
//   bun run deploy:trial --cache    switch to (and remember) the published-page cache manifests
//   bun run deploy:trial --normal   switch back to (and remember) the normal manifests
//   bun run deploy:trial --dry-run  build and bundle only; nothing is uploaded
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const API = "https://api.lord2ve.tech";
const WEB = "https://lord2ve.tech";
const modeFile = resolve(root, "work/deploy-trial.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const quiet = {
	...process.env,
	CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
	WRANGLER_WRITE_LOGS: "false",
	WRANGLER_SEND_METRICS: "false",
	NEXT_TELEMETRY_DISABLED: "1",
};

type Mode = "normal" | "cache";
const remembered: Mode = existsSync(modeFile)
	? JSON.parse(readFileSync(modeFile, "utf8")).mode === "cache"
		? "cache"
		: "normal"
	: "normal";
const mode: Mode = args.has("--cache") ? "cache" : args.has("--normal") ? "normal" : remembered;

const step = (text: string) => console.log(`\n▶ ${text}`);
const fail = (text: string): never => {
	console.error(`\n✖ ${text}`);
	process.exit(1);
};

/** Runs one command in the repository with the terminal attached; stops the release on failure. */
function run(command: string[], cwd = root, env: Record<string, string | undefined> = quiet) {
	const result = Bun.spawnSync(command, { cwd, env, stdio: ["inherit", "inherit", "inherit"] });
	if (result.exitCode !== 0) fail(`Command failed: ${command.join(" ")}`);
}
const output = (command: string[]) =>
	new TextDecoder().decode(Bun.spawnSync(command, { cwd: root }).stdout).trim();

step("Checking the checkout");
if (output(["git", "branch", "--show-current"]) !== "main")
	fail("Switch to main first: git switch main && git pull --ff-only origin main");
if (output(["git", "status", "--porcelain", "--untracked-files=no"]))
	fail("There are uncommitted changes to tracked files. Commit or discard them first.");
run(["git", "fetch", "--quiet", "origin", "main"]);
if (output(["git", "rev-parse", "HEAD"]) !== output(["git", "rev-parse", "origin/main"]))
	fail("This checkout is not the latest main: git pull --ff-only origin main");
console.log(`  main at ${output(["git", "log", "--oneline", "-1"])}`);
console.log(`  mode: ${mode === "cache" ? "published-page cache ON" : "normal (cache off)"}`);
console.log("  reminder: if this release adds a database migration, run bun run db:migrate first.");

step("Installing the locked dependencies");
run(["bun", "install", "--frozen-lockfile"]);

step("Building the web app for the trial origins");
run(["bun", "--no-env-file", "run", "--cwd", "apps/web", "build:cloudflare"], root, {
	...quiet,
	NEXT_PUBLIC_API_URL: API,
	NEXT_PUBLIC_WEB_URL: WEB,
	API_URL: API,
});

const wrangler = ["bun", "--no-env-file", "x", "--no-install", "wrangler", "deploy"];
const dry = dryRun ? ["--dry-run"] : [];
step(`Deploying the API${dryRun ? " (dry run)" : ""}`);
run([
	...wrangler,
	"--config",
	mode === "cache" ? "apps/api/wrangler.cache.toml" : "apps/api/wrangler.toml",
	...dry,
]);

step(`Deploying the web app${dryRun ? " (dry run)" : ""}`);
// Wrangler uploads the OpenNext output directly; the cache adapter never seeds the bucket at deploy.
run(
	mode === "cache"
		? [
				...wrangler,
				"--config",
				"apps/web/wrangler.cache.toml",
				"--var",
				"PORTFOLIO_CACHE_ENABLED:true",
				...dry,
			]
		: [...wrangler, "--config", "apps/web/wrangler.toml", ...dry],
);

if (!dryRun) {
	mkdirSync(resolve(root, "work"), { recursive: true });
	writeFileSync(modeFile, `${JSON.stringify({ mode }, null, 2)}\n`);
	step("Checking the public endpoints");
	for (const url of [`${API}/health`, `${WEB}/en`]) {
		const response = await fetch(url, { redirect: "manual" }).catch(() => undefined);
		console.log(
			`  ${response?.status === 200 ? "✔" : "✖"} ${url} → ${response?.status ?? "no response"}`,
		);
		if (response?.status !== 200)
			fail(
				`${url} did not answer 200. Check it in the browser; roll back in the Cloudflare dashboard if needed.`,
			);
	}
}
console.log(`\n✔ ${dryRun ? "Dry run finished; nothing was uploaded." : "Release deployed."}`);
