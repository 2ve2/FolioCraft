import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { env } from "../src/config/env";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { passwordFailures } from "../src/services/admin/password-failures";
import { account, error, request } from "./helpers";

// Real database; removes only the accounts and failure buckets it created.
const ids: string[] = [];
afterAll(async () => {
	if (!ids.length) return;
	await db.delete(rateBuckets).where(
		inArray(
			rateBuckets.key,
			ids.map((id) => passwordFailures.key(id)),
		),
	);
	await db.delete(user).where(inArray(user.id, ids));
});

// Each attempt comes from a different address, so only the per-account budget can stop it.
let address = 0;
const nextIp = () => `198.51.100.${++address}`;

test("wrong current passwords block password-checked account actions for that account only", async () => {
	const owner = await account("password-attempts", ids);
	const other = await account("password-attempts-other", ids);
	const change = (cookie: string, currentPassword: string) =>
		request(
			"/api/auth/change-password",
			"POST",
			{ currentPassword, newPassword: `Changed-${crypto.randomUUID()}` },
			cookie,
			nextIp(),
		);

	for (let attempt = 0; attempt < env.ADMIN_PASSWORD_MAX_FAILURES; attempt++)
		await error(await change(owner.cookie, "wrong-password-guess"), 400, "INVALID_PASSWORD");

	// The correct password is refused too while the block lasts, on every password-checked path.
	await error(await change(owner.cookie, owner.password), 429, "PASSWORD_ATTEMPTS_BLOCKED");
	await error(
		await request(
			"/api/auth/two-factor/enable",
			"POST",
			{ password: owner.password },
			owner.cookie,
			nextIp(),
		),
		429,
		"PASSWORD_ATTEMPTS_BLOCKED",
	);

	// Another account is unaffected and a correct password still works for it.
	const response = await change(other.cookie, other.password);
	expect(response.status).toBe(200);
});
