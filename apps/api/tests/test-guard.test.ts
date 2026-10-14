import { expect, test } from "bun:test";

test("integration guard refuses production mode, remote hosts and non-test databases before app import", async () => {
	const guard = new URL("./test-guard.ts", import.meta.url).pathname;
	for (const config of [
		{ NODE_ENV: "production", DATABASE_URL: "postgresql://folio@localhost:55432/folio_test" },
		{ NODE_ENV: "test", DATABASE_URL: "postgresql://folio@ep-example.neon.tech/folio_test" },
		{ NODE_ENV: "test", DATABASE_URL: "postgresql://folio@localhost:55432/production" },
	]) {
		const child = Bun.spawn([process.execPath, guard], {
			env: { ...process.env, ...config },
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(await child.exited).not.toBe(0);
		expect(await new Response(child.stderr).text()).toContain("error:");
	}
	const child = Bun.spawn([process.execPath, guard], {
		env: {
			...process.env,
			NODE_ENV: "test",
			DATABASE_URL: "postgresql://folio@localhost:55432/folio_test",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(await child.exited).toBe(0);
});
