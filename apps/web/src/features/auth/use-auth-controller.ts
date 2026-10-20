"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { localeHref } from "../../lib/locale";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { copy } from "../studio/copy";
import { recoveryCopy } from "./recovery-copy";
import { recoveryError } from "./recovery-request";

export type AuthMode = "login" | "signup";

/** Owns native authentication requests and routes authenticated users into their workspace. */
export function useAuthController(mode: AuthMode) {
	const [locale, setLocale] = useInterfaceLocale();
	const t = copy[locale];
	const router = useRouter();
	const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [returnToAdmin, setReturnToAdmin] = useState(false);
	const [verificationRequired, setVerificationRequired] = useState(false);
	const [emailNotVerified, setEmailNotVerified] = useState(false);
	const pending = useRef(false);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		setReturnToAdmin(new URLSearchParams(window.location.search).get("from") === "admin");
		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (session?.user) router.replace(localeHref(locale, `/${returnToAdmin ? "admin" : "studio"}`));
	}, [session?.user, locale, router, returnToAdmin]);

	/** Submits the existing Better Auth protocol and keeps failures beside the current form. */
	async function authenticate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError("");
		setVerificationRequired(false);
		setEmailNotVerified(false);
		const data = new FormData(event.currentTarget);
		try {
			const input = { email: String(data.get("email")), password: String(data.get("password")) };
			const result =
				mode === "signup"
					? await authClient.signUp.email({
							...input,
							name: String(data.get("name")),
							callbackURL: `${window.location.origin}${localeHref(locale, "/verify-email?verified=1")}`,
						})
					: await authClient.signIn.email(input);
			if (!mounted.current) return;
			if (result.error) {
				const code = result.error.code || "";
				setEmailNotVerified(code === "EMAIL_NOT_VERIFIED");
				setError(
					code === "MAIL_UNAVAILABLE" ||
						code === "MAIL_DELIVERY_FAILED" ||
						code === "EMAIL_NOT_VERIFIED"
						? code === "EMAIL_NOT_VERIFIED"
							? locale === "ar"
								? "يلزم تأكيد بريدك. استخدم رابط إعادة إرسال رسالة التحقق أدناه."
								: "Verify your email. Use the resend verification link below."
							: recoveryCopy[locale][recoveryError(result.error)]
						: code.includes("ALREADY_EXISTS")
							? t.authExists
							: code === "INVALID_EMAIL_OR_PASSWORD"
								? t.authCredentials
								: result.error.status === 429
									? t.authRateLimit
									: t.authFailure,
				);
				return;
			}
			if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
				router.replace(localeHref(locale, "/admin/mfa-required?challenge=1"));
				return;
			}
			await refetch();
			if (mounted.current && mode === "signup" && !result.data?.token)
				setVerificationRequired(true);
		} catch {
			if (mounted.current) setError(t.unavailable);
		} finally {
			pending.current = false;
			if (mounted.current) setBusy(false);
		}
	}

	return {
		locale,
		setLocale,
		t,
		session,
		isPending,
		sessionError,
		refetch,
		busy,
		error,
		verificationRequired,
		emailNotVerified,
		returnToAdmin,
		authenticate,
	};
}
