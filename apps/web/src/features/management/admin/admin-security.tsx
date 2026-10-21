"use client";
import { isStaff } from "@ichnara/contracts/admin-policy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Brand } from "../../../components/ui/brand";
import { ButtonContent } from "../../../components/ui/button-content";
import { LanguageSwitch } from "../../../components/ui/language-switch";
import { authClient } from "../../../lib/auth-client";
import { localeHref } from "../../../lib/locale";
import { useInterfaceLocale } from "../../../lib/use-interface-locale";
import styles from "../../auth/auth.module.css";
import { LoadingScreen } from "../../studio/loading-screen";
import { adminSecurityCopy } from "./admin-security-copy";
import { OwnSessions } from "./own-sessions";

/** Provides only native own-account enrollment/challenge actions; never requests management data. */
export function AdminSecurity() {
	const [locale, setLocale] = useInterfaceLocale();
	const t = adminSecurityCopy[locale];
	const router = useRouter();
	const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
	const [challenge, setChallenge] = useState(false);
	const [setup, setSetup] = useState<{ key: string; codes: string[] } | null>(null);
	const [complete, setComplete] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const pending = useRef(false);
	useEffect(() => {
		setChallenge(new URLSearchParams(window.location.search).get("challenge") === "1");
	}, []);

	/** Runs a single native setup operation and clears password fields immediately after submitting. */
	async function enable(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current) return;
		const form = event.currentTarget;
		const password = String(new FormData(form).get("password"));
		form.reset();
		pending.current = true;
		setBusy(true);
		setError("");
		try {
			const response = await authClient.twoFactor.enable({ password, method: "totp" });
			if (response.error || !response.data || !("totpURI" in response.data))
				throw new Error(t.failure);
			const key = new URL(response.data.totpURI).searchParams.get("secret");
			if (!key) throw new Error(t.failure);
			setSetup({ key, codes: response.data.backupCodes });
		} catch {
			setError(t.failure);
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}

	/** Completes native enrollment or a pending sign-in challenge without inventing a session. */
	async function verify(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current) return;
		const form = event.currentTarget;
		const code = String(new FormData(form).get("code")).trim();
		form.reset();
		if (!/^\d{6}$/.test(code)) {
			setError(t.invalid);
			return;
		}
		pending.current = true;
		setBusy(true);
		setError("");
		try {
			const response = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
			if (response.error) {
				setError(response.error.status === 429 ? t.limited : t.failure);
				return;
			}
			if (challenge) {
				const current = await authClient.getSession();
				if (current.error || !current.data?.user) throw new Error(t.failure);
				setSetup(null);
				router.replace(
					localeHref(locale, `/${isStaff(current.data.user.role) ? "admin" : "studio"}`),
				);
			} else {
				setComplete(true);
				await refetch();
			}
		} catch {
			setError(t.failure);
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}

	/** Ends the enrollment-only session before a password/TOTP sign-in; secrets remain in page memory only. */
	async function restart() {
		if (pending.current) return;
		pending.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await authClient.signOut();
			if (result.error) throw new Error(t.failure);
			setSetup(null);
			window.location.replace(localeHref(locale, "/login?from=admin"));
		} catch {
			setError(t.failure);
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}
	if (isPending) return <LoadingScreen locale={locale} message={t.loading} />;
	const staff = session?.user && isStaff(session.user.role) && !session.session.impersonatedBy;
	const canEnroll = staff && !session.user.twoFactorEnabled && !complete;
	const showVerify =
		!sessionError && ((challenge && !session?.user) || (staff && setup && !complete));
	return (
		<div
			className={`welcome-page ${styles.page}`}
			dir={locale === "ar" ? "rtl" : "ltr"}
			lang={locale}
		>
			<header className="welcome-header">
				<Link href={localeHref(locale, "/")}>
					<Brand locale={locale} />
				</Link>
				<LanguageSwitch locale={locale} onChange={setLocale} />
			</header>
			<main className={styles.main}>
				<section className={`editor-card ${styles.card}`} aria-busy={busy}>
					<h1>{t.title}</h1>
					<p>{challenge ? t.challenge : t.intro}</p>
					{(error || sessionError) && <p role="alert">{error || t.failure}</p>}
					{!sessionError && canEnroll && !setup && (
						<form onSubmit={enable}>
							<label className="field">
								{t.password}
								<input
									name="password"
									type="password"
									autoComplete="current-password"
									required
									maxLength={128}
									disabled={busy}
								/>
							</label>
							<button className="primary" type="submit" disabled={busy}>
								<ButtonContent loading={busy}>{t.enable}</ButtonContent>
							</button>
						</form>
					)}
					{staff && setup && (
						<>
							<p>{t.setup}</p>
							<label className="field">
								{t.secret}
								<input value={setup.key} readOnly dir="ltr" autoComplete="off" />
							</label>
							<p>
								{t.account}: <bdi>{session.user.email}</bdi>
							</p>
							<p>{t.backup}</p>
							<ul dir="ltr">
								{setup.codes.map((code) => (
									<li key={code}>
										<code>{code}</code>
									</li>
								))}
							</ul>
						</>
					)}
					{showVerify && (
						<form onSubmit={verify}>
							<label className="field">
								{t.code}
								<input
									name="code"
									inputMode="numeric"
									autoComplete="one-time-code"
									pattern="[0-9]{6}"
									maxLength={6}
									required
									disabled={busy}
									dir="ltr"
								/>
							</label>
							<button className="primary" type="submit" disabled={busy}>
								<ButtonContent loading={busy}>{t.verify}</ButtonContent>
							</button>
						</form>
					)}
					{!sessionError && staff && (complete || session.user.twoFactorEnabled) && (
						<>
							<p role="status">{complete ? t.complete : t.enrolled}</p>
							<button
								className="primary"
								type="button"
								onClick={() => void restart()}
								disabled={busy}
							>
								<ButtonContent loading={busy}>{t.restart}</ButtonContent>
							</button>
						</>
					)}
					{!sessionError && session?.user && !staff && <p>{t.denied}</p>}
					{!session?.user && !challenge && (
						<Link href={localeHref(locale, "/login?from=admin")}>{t.login}</Link>
					)}
					{staff && session.user.twoFactorEnabled && !complete && !setup && (
						<OwnSessions locale={locale} currentId={session.session.id} />
					)}
					<p>{t.recovery}</p>
					<Link href={localeHref(locale, "/")}>{t.home}</Link>
				</section>
			</main>
		</div>
	);
}
