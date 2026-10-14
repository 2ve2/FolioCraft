// Tests must never inherit the development/production database connection.
const database = process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test";
const parsed = new URL(database);
if (
	!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
	parsed.pathname !== "/folio_test"
) {
	throw new Error(
		"Integration tests require isolated local folio_test; production databases are rejected",
	);
}
const adminBrowser = process.argv.includes("--admin-browser");
const environment = {
	...process.env,
	DATABASE_URL: database,
	NODE_ENV: "test",
	BETTER_AUTH_SECRET: "isolated-test-secret-at-least-32-characters-only",
	API_URL: adminBrowser ? "http://127.0.0.1:4400" : "http://localhost:4000",
	WEB_URL: adminBrowser ? "http://127.0.0.1:4300" : "http://localhost:3000",
	SMTP_HOST: "",
	SMTP_USER: "",
	SMTP_PASSWORD: "",
	MAIL_FROM: "",
	R2_ACCOUNT_ID: "",
	R2_ENDPOINT: "",
	R2_ACCESS_KEY_ID: "",
	R2_SECRET_ACCESS_KEY: "",
	R2_BUCKET: "",
};
for (const command of [
	["bun", "run", "db:migrate"],
	adminBrowser ? ["bun", "../../scripts/admin-browser-fixture.ts"] : ["bun", "test", "tests"],
]) {
	const child = Bun.spawn(command, {
		cwd: new URL("../apps/api", import.meta.url).pathname,
		env: environment,
		stdout: "inherit",
		stderr: "inherit",
	});
	// Keep the parent alive while a browser fixture finishes its guarded cleanup.
	const stop = (signal: "SIGINT" | "SIGTERM") => child.kill(signal);
	const interrupt = () => stop("SIGINT");
	const terminate = () => stop("SIGTERM");
	if (adminBrowser) {
		process.on("SIGINT", interrupt);
		process.on("SIGTERM", terminate);
	}
	const code = await child.exited;
	if (adminBrowser) {
		process.off("SIGINT", interrupt);
		process.off("SIGTERM", terminate);
	}
	if (code !== 0) process.exit(code);
}
