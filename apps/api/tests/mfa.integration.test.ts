import "./test-guard";
import { expect, test } from "bun:test";

/** Runs MFA acceptance with enforcement enabled while existing pure RBAC fixtures explicitly bypass it. */
test("enforced native MFA and synthetic secret-rotation acceptance", async () => {
	const child = Bun.spawn([process.execPath, "test", "tests/fixtures/mfa.test.ts"], {
		cwd: new URL("..", import.meta.url).pathname,
		env: { ...process.env, ADMIN_REQUIRE_MFA: "true" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, err, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0) console.error(out + err);
	expect(code).toBe(0);
	console.info(
		JSON.stringify({
			event: "enforced_mfa_suite",
			summary: (out + err)
				.split("\n")
				.filter((line) => /\d+ (pass|fail)|expect\(\) calls|Ran \d+ tests/.test(line))
				.join("; "),
		}),
	);
}, 60_000);
