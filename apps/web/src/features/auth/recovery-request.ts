import type { Locale } from "@ichnara/contracts";
import { localeHref } from "../../lib/locale";

export type RecoveryMode = "forgot" | "reset" | "verify";
type NativeResult = { error?: { code?: string; status?: number } | null };
export type RecoveryClient = {
	requestPasswordReset(input: { email: string; redirectTo: string }): Promise<NativeResult>;
	sendVerificationEmail(input: { email: string; callbackURL: string }): Promise<NativeResult>;
	resetPassword(input: { newPassword: string; token: string }): Promise<NativeResult>;
};
export type RecoveryInput = { email: string; password: string; confirm: string; token: string };

/** Submits only the native protocol with fixed same-origin, locale-aware callback paths. */
export async function requestRecovery(
	client: RecoveryClient,
	mode: RecoveryMode,
	input: RecoveryInput,
	origin: string,
	locale: Locale,
) {
	if (mode === "reset") {
		if (!input.token) return { code: "INVALID_TOKEN" };
		if (input.password !== input.confirm) return { code: "PASSWORD_MISMATCH" };
		if (input.password.length < 10 || input.password.length > 128)
			return { code: "PASSWORD_LENGTH" };
		return (
			(await client.resetPassword({ newPassword: input.password, token: input.token })).error ??
			null
		);
	}
	const callback = new URL(
		localeHref(locale, mode === "forgot" ? "/reset-password" : "/verify-email"),
		origin,
	);
	if (mode === "verify") callback.searchParams.set("verified", "1");
	const result =
		mode === "forgot"
			? await client.requestPasswordReset({ email: input.email, redirectTo: callback.href })
			: await client.sendVerificationEmail({ email: input.email, callbackURL: callback.href });
	return result.error ?? null;
}

/** Maps stable native errors to local copy without displaying server exception text. */
export function recoveryError(error: { code?: string; status?: number }) {
	if (error.code === "MAIL_UNAVAILABLE") return "mailUnavailable";
	if (error.code === "MAIL_DELIVERY_FAILED") return "mailFailed";
	if (error.code === "PASSWORD_MISMATCH") return "mismatch";
	if (error.code === "PASSWORD_LENGTH" || error.code?.startsWith("PASSWORD_TOO_"))
		return "passwordLength";
	if (
		[
			"INVALID_TOKEN",
			"TOKEN_EXPIRED",
			"INVALID_VERIFICATION_TOKEN",
			"INVALID_SIGNATURE",
			"TOKEN_NOT_FOUND",
		].includes(error.code ?? "")
	)
		return "invalid";
	if (error.status === 429) return "rate";
	return "failure";
}
