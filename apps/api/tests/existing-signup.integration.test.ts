import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { auth } from "../src/lib/auth";
import * as mail from "../src/lib/auth/mail";
import { authMailContent } from "../src/lib/auth/mail-templates";
import { account, error, request } from "./helpers";

const users: string[] = [];
afterAll(async () => {
	if (users.length) await db.delete(user).where(inArray(user.id, users));
});

test("a sign-up with a registered address is refused by name and creates nothing", async () => {
	const owner = await account("existing-refused", users);
	const send = spyOn(mail, "sendAuthMail").mockImplementation(async () => {});
	try {
		const response = await request(
			"/api/auth/sign-up/email",
			"POST",
			{ name: "Someone else", email: owner.email.toUpperCase(), password: "Another-password-1" },
			undefined,
			`192.0.2.${Math.floor(Math.random() * 200) + 20}`,
		);
		await error(response, 422, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
		expect(send).not.toHaveBeenCalled();
		const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, owner.email));
		expect(rows.map((row) => row.id)).toEqual([owner.id]);
	} finally {
		send.mockRestore();
	}
});

test("a sign-up that races past the check notifies the owner once an hour, in their language, silently", async () => {
	const owner = await account("existing-signup", users);
	const hook = auth.options.emailAndPassword?.onExistingUserSignUp;
	expect(hook).toBeDefined();
	const sent: { to: string; url: string; kind: string }[] = [];
	const send = spyOn(mail, "sendAuthMail").mockImplementation(async (to, _name, url, kind) => {
		sent.push({ to, url, kind });
	});
	const request = (locale: string) =>
		new Request("https://api.example.test/api/auth/sign-up/email", {
			method: "POST",
			body: JSON.stringify({
				callbackURL: `https://web.example.test/${locale}/verify-email?verified=1`,
			}),
		});
	try {
		const row = { id: owner.id, email: owner.email, name: "Existing" };
		await hook?.({ user: row as never }, request("ar"));
		await hook?.({ user: row as never }, request("ar"));
		expect(sent).toHaveLength(1);
		expect(sent[0].to).toBe(owner.email);
		expect(sent[0].kind).toBe("existing-account");
		expect(new URL(sent[0].url).pathname).toBe("/ar/login");

		// A delivery failure never escapes, so the sign-up response cannot differ.
		send.mockImplementation(async () => {
			throw new Error("transport down");
		});
		const other = await account("existing-signup-fail", users);
		const warning = spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			hook?.({ user: { id: other.id, email: other.email, name: "Other" } as never }, request("en")),
		).resolves.toBeUndefined();
		warning.mockRestore();
	} finally {
		send.mockRestore();
		// Buckets are stored under hashed keys; remove only this test's.
		const keys = users.map((id) =>
			createHash("sha256").update(`existing-signup:${id}`).digest("hex"),
		);
		if (keys.length) await db.delete(rateBuckets).where(inArray(rateBuckets.key, keys));
	}
});

test("the existing-account notice is written in both languages with a sign-in link", () => {
	for (const locale of ["ar", "en"] as const) {
		const mailContent = authMailContent(
			"existing-account",
			locale,
			"Sara",
			`https://web.example.test/${locale}/login`,
			"https://web.example.test",
		);
		expect(mailContent.html).toContain(`https://web.example.test/${locale}/login`);
		expect(mailContent.text).toContain(
			locale === "ar" ? "لديك حساب بهذا البريد" : "You already have an account",
		);
		expect(mailContent.html).toContain(`lang="${locale}"`);
	}
});
