import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

if (process.env.NODE_ENV !== "test" || process.env.API_URL !== "http://127.0.0.1:4400")
	throw new Error("Use bun run test:e2e to start the guarded local applications");

export default defineConfig({
	testDir: ".",
	testMatch: "**/*.spec.ts",
	fullyParallel: false,
	workers: 1,
	forbidOnly: true,
	retries: 0,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	outputDir: resolve(import.meta.dirname, "../work/e2e-results"),
	reporter: [
		["line"],
		["html", { outputFolder: resolve(import.meta.dirname, "../work/e2e-report"), open: "never" }],
	],
	use: {
		...devices["Desktop Chrome"],
		baseURL: "http://127.0.0.1:4300",
		serviceWorkers: "block",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
});
