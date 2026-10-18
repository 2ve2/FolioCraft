import "./test-guard";
import { expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { user, verification } from "../src/db/schema/auth";
import { auth } from "../src/lib/auth";
import { account, request } from "./helpers";

test("native reset consumes a valid local token, rejects expired/reused tokens and revokes prior sessions", async () => {
	const ids: string[] = [];
	const identifiers: string[] = [];
	try {
		const owner = await account("recovery", ids);
		const context = await auth.$context;
		for (const expired of [true, false]) {
			const token = crypto.randomUUID();
			const identifier = `reset-password:${token}`;
			identifiers.push(identifier);
			// Seed only a disposable local native token: no SMTP or delivery claim.
			await context.internalAdapter.createVerificationValue({
				identifier,
				value: owner.id,
				expiresAt: new Date(Date.now() + (expired ? -60000 : 60000)),
			});
			const response = await request("/api/auth/reset-password", "POST", {
				token,
				newPassword: "New-password-12345",
			});
			expect(response.status).toBe(expired ? 400 : 200);
			if (!expired) {
				const oldSession = await request("/api/auth/get-session", "GET", undefined, owner.cookie);
				expect(await oldSession.json()).toBeNull();
				const replay = await request("/api/auth/reset-password", "POST", {
					token,
					newPassword: "Another-password-123",
				});
				expect(replay.status).toBe(400);
				const login = await request("/api/auth/sign-in/email", "POST", {
					email: owner.email,
					password: "New-password-12345",
				});
				expect(login.status).toBe(200);
			}
		}
		for (const path of ["request-password-reset", "send-verification-email"]) {
			const response = await request(`/api/auth/${path}`, "POST", { email: owner.email });
			expect(response.status).toBe(503);
			expect(await response.json()).toMatchObject({ code: "MAIL_UNAVAILABLE" });
		}
	} finally {
		if (identifiers.length)
			await db.delete(verification).where(inArray(verification.identifier, identifiers));
		for (const id of ids) await db.delete(user).where(eq(user.id, id));
	}
});
