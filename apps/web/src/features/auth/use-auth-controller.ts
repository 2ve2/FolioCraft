"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { copy } from "../studio/copy";

export type AuthMode = "login" | "signup";

/** Owns native authentication requests and routes authenticated users into their workspace. */
export function useAuthController(mode: AuthMode) {
	const [locale, setLocale, localeReady] = useInterfaceLocale();
	const t = copy[locale];
	const router = useRouter();
	const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [returnToAdmin, setReturnToAdmin] = useState(false);
	const [verificationRequired, setVerificationRequired] = useState(false);
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
		if (localeReady && session?.user)
			router.replace(`/${returnToAdmin ? "admin" : "studio"}?lang=${locale}`);
	}, [session?.user, locale, localeReady, router, returnToAdmin]);

	/** Submits the existing Better Auth protocol and keeps failures beside the current form. */
	async function authenticate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError("");
		setVerificationRequired(false);
		const data = new FormData(event.currentTarget);
		try {
			const input = { email: String(data.get("email")), password: String(data.get("password")) };
			const result =
				mode === "signup"
					? await authClient.signUp.email({ ...input, name: String(data.get("name")) })
					: await authClient.signIn.email(input);
			if (!mounted.current) return;
			if (result.error) {
				const code = result.error.code || "";
				setError(
					code.includes("ALREADY_EXISTS")
						? t.authExists
						: code === "INVALID_EMAIL_OR_PASSWORD"
							? t.authCredentials
							: result.error.status === 429
								? t.authRateLimit
								: t.authFailure,
				);
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
		isPending: isPending || !localeReady,
		sessionError,
		refetch,
		busy,
		error,
		verificationRequired,
		returnToAdmin,
		authenticate,
	};
}
