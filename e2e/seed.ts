import "../apps/api/tests/test-guard";
import { eq, gt } from "drizzle-orm";
import app from "../apps/api/src/app";
import { db, pool } from "../apps/api/src/db";
import { rateLimit, user } from "../apps/api/src/db/schema/auth";

// Private stdin/stdout protocol: never return tokens, cookies or passwords to the reporter.
const input = process.argv.includes("--wait-budget")
	? { action: "wait-budget" }
	: await Bun.stdin.json();
if (input.action !== "wait-budget" && !/^e2e-[a-f0-9-]+@example\.com$/.test(input.email))
	throw new Error("Invalid fixture identity");
try {
	if (input.action === "wait-budget") {
		// Repeated runs share the same loopback IP. Wait for existing native budgets to expire;
		// never clear rate records, disable limits or weaken the real server's IP checks.
		const deadline = Date.now() + 65_000;
		while (true) {
			const recent = await db
				.select({ id: rateLimit.id })
				.from(rateLimit)
				.where(gt(rateLimit.lastRequest, Date.now() - 60_000))
				.limit(1);
			if (!recent.length) break;
			if (Date.now() > deadline)
				throw new Error("Local test database is still in use; run suites separately");
			await Bun.sleep(250);
		}
		console.log("Local native authentication budgets ready");
	} else if (input.action === "remove") {
		await db.delete(user).where(eq(user.email, input.email));
		const remaining = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, input.email));
		if (remaining.length) throw new Error("Fixture cleanup failed");
		console.log(JSON.stringify({ removed: true }));
	} else if (input.action === "create") {
		const response = await app.request("http://127.0.0.1:4400/api/auth/sign-up/email", {
			method: "POST",
			headers: {
				Origin: "http://127.0.0.1:4300",
				"Content-Type": "application/json",
				"x-folio-client-ip": `127.${crypto.getRandomValues(new Uint8Array(3)).join(".")}`,
			},
			body: JSON.stringify({ email: input.email, password: input.password, name: input.name }),
		});
		if (response.status !== 200) throw new Error(`Fixture signup status: ${response.status}`);
		const { user: account } = await response.json();
		console.log(JSON.stringify({ id: account.id }));
	} else throw new Error("Unknown fixture operation");
} finally {
	await pool.end();
}
