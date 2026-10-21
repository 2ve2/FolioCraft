import { spawnSync } from "node:child_process";
import { apiURL, expect, test } from "./fixtures";

for (const [label, database] of [
	["hosted database", "postgresql://folio@db.example.com/folio_test"],
	["non-test database", "postgresql://folio@127.0.0.1:55432/folio"],
	["connection overrides", "postgresql://folio@127.0.0.1:55432/folio_test?host=db.example.com"],
]) {
	test(`runner rejects ${label} before starting services`, async () => {
		const result = spawnSync("bun", ["--no-env-file", "scripts/test-e2e.ts"], {
			env: { ...process.env, TEST_DATABASE_URL: database },
			encoding: "utf8",
			timeout: 5000,
		});
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("E2E requires local disposable folio_test");
	});
}

test("real API reports mail and storage disabled", async ({ request }) => {
	const response = await request.get(`${apiURL}/ready`);
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({
		status: true,
		integrations: { mail: "disabled", storage: "disabled" },
	});
});
