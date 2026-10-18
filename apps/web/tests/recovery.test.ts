import { expect, test } from "bun:test";
import { recoveryCopy } from "../src/features/auth/recovery-copy";
import {
	type RecoveryClient,
	recoveryError,
	requestRecovery,
} from "../src/features/auth/recovery-request";

const input = {
	email: "fixture@example.com",
	password: "New-password-123",
	confirm: "New-password-123",
	token: "fixture-token",
};

test("native recovery uses fixed bilingual callback destinations and preserves native failures", async () => {
	const calls: unknown[] = [];
	const client: RecoveryClient = {
		async requestPasswordReset(body) {
			calls.push(body);
			return { error: { code: "MAIL_UNAVAILABLE", status: 503 } };
		},
		async sendVerificationEmail(body) {
			calls.push(body);
			return { error: null };
		},
		async resetPassword(body) {
			calls.push(body);
			return { error: { code: "INVALID_TOKEN", status: 400 } };
		},
	};
	for (const locale of ["ar", "en"] as const) {
		expect(
			await requestRecovery(client, "forgot", input, "https://app.example.com", locale),
		).toEqual({ code: "MAIL_UNAVAILABLE", status: 503 });
		expect(calls.at(-1)).toEqual({
			email: input.email,
			redirectTo: `https://app.example.com/reset-password?lang=${locale}`,
		});
		expect(
			await requestRecovery(client, "verify", input, "https://app.example.com", locale),
		).toBeNull();
		expect(calls.at(-1)).toEqual({
			email: input.email,
			callbackURL: `https://app.example.com/verify-email?lang=${locale}&verified=1`,
		});
	}
	expect(await requestRecovery(client, "reset", input, "https://app.example.com", "en")).toEqual({
		code: "INVALID_TOKEN",
		status: 400,
	});
	expect(calls.at(-1)).toEqual({ newPassword: input.password, token: input.token });
});

test("reset rejects missing token, mismatched and out-of-range passwords before sending", async () => {
	let calls = 0;
	const native = async () => {
		calls++;
		return { error: null };
	};
	const client = {
		requestPasswordReset: native,
		sendVerificationEmail: native,
		resetPassword: native,
	};
	for (const [patch, code] of [
		[{ token: "" }, "INVALID_TOKEN"],
		[{ confirm: "different" }, "PASSWORD_MISMATCH"],
		[{ password: "short", confirm: "short" }, "PASSWORD_LENGTH"],
		[{ password: "x".repeat(129), confirm: "x".repeat(129) }, "PASSWORD_LENGTH"],
	] as const) {
		expect(
			await requestRecovery(
				client,
				"reset",
				{ ...input, ...patch },
				"https://app.example.com",
				"ar",
			),
		).toEqual({ code });
	}
	expect(calls).toBe(0);
	expect(await requestRecovery(client, "reset", input, "https://app.example.com", "ar")).toBeNull();
	expect(calls).toBe(1);
});

test("recovery errors and accepted copy never assert recipient delivery", async () => {
	for (const [code, key] of [
		["MAIL_UNAVAILABLE", "mailUnavailable"],
		["MAIL_DELIVERY_FAILED", "mailFailed"],
		["INVALID_TOKEN", "invalid"],
		["TOKEN_EXPIRED", "invalid"],
		["UNEXPECTED", "failure"],
	] as const)
		expect(recoveryError({ code })).toBe(key);
	expect(recoveryError({ status: 429 })).toBe("rate");
	expect(recoveryCopy.en.accepted).toContain("Delivery is not confirmed");
	expect(recoveryCopy.ar.accepted).toContain("لا تؤكد");
	const failure = async () => {
		throw new Error("offline");
	};
	await expect(
		requestRecovery(
			{ requestPasswordReset: failure, sendVerificationEmail: failure, resetPassword: failure },
			"forgot",
			input,
			"https://app.example.com",
			"en",
		),
	).rejects.toThrow("offline");
});
