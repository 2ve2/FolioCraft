"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { recoveryCopy } from "./recovery-copy";
import { type RecoveryMode, recoveryError, requestRecovery } from "./recovery-request";

/** Keeps recovery requests, token handling and truthful result feedback in the account feature. */
export function useRecoveryController(mode: RecoveryMode) {
	const [locale, setLocale, ready] = useInterfaceLocale();
	const [token, setToken] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [returned, setReturned] = useState(false);
	const [callbackError, setCallbackError] = useState(false);
	const [busy, setBusy] = useState(false);
	const pending = useRef(false);
	const mounted = useRef(true);
	const t = recoveryCopy[locale];

	useEffect(() => {
		mounted.current = true;
		const params = new URLSearchParams(window.location.search);
		setToken(params.has("error") ? "" : (params.get("token") ?? ""));
		setCallbackError(params.has("error"));
		setReturned(params.get("verified") === "1" && !params.has("error"));
		return () => {
			mounted.current = false;
		};
	}, []);

	/** Sends one native request at a time; never treats a transport error as successful mail delivery. */
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError("");
		setSuccess(false);
		const form = event.currentTarget;
		const data = new FormData(form);
		try {
			const failure = await requestRecovery(
				authClient,
				mode,
				{
					email: String(data.get("email") ?? ""),
					password: String(data.get("password") ?? ""),
					confirm: String(data.get("confirm") ?? ""),
					token,
				},
				window.location.origin,
				locale,
			);
			if (!mounted.current) return;
			if (failure) {
				setError(t[recoveryError(failure)]);
				return;
			}
			setSuccess(true);
			if (mode === "reset") {
				setToken("");
				form.reset();
				window.history.replaceState(null, "", `/reset-password?lang=${locale}`);
			}
		} catch {
			if (mounted.current) setError(t.failure);
		} finally {
			pending.current = false;
			if (mounted.current) setBusy(false);
		}
	}

	return {
		locale,
		setLocale,
		ready,
		t,
		token,
		error,
		success,
		returned,
		callbackError,
		busy,
		submit,
	};
}
