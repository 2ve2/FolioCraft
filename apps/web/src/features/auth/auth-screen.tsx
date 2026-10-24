"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Brand } from "../../components/ui/brand";
import { ButtonContent } from "../../components/ui/button-content";
import { Field } from "../../components/ui/field";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { localeHref } from "../../lib/locale";
import { LoadingScreen } from "../studio/loading-screen";
import styles from "./auth.module.css";
import { AuthRecoveryLinks } from "./auth-recovery-links";
import { SignupFields } from "./signup-fields";
import { SignupSent } from "./signup-sent";
import { type AuthMode, useAuthController } from "./use-auth-controller";

/** Renders a dedicated authentication page without landing-page content or examples. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
	const {
		locale,
		setLocale,
		t,
		session,
		sessionError,
		refetch,
		busy,
		error,
		sentTo,
		resetSignup,
		emailNotVerified,
		emailTaken,
		returnToAdmin,
		authenticate,
	} = useAuthController(mode);
	const firstInput = useRef<HTMLInputElement>(null);
	const ar = locale === "ar";
	const title = mode === "signup" ? t.signup : t.login;

	useEffect(() => {
		// Never move focus away from a field the visitor already chose.
		if (!session && !sessionError && document.activeElement === document.body)
			firstInput.current?.focus();
	}, [session, sessionError]);

	// The form renders immediately (also in the prerendered HTML); only an existing session
	// replaces it while redirecting to the workspace.
	if (session?.user) return <LoadingScreen locale={locale} message={t.authLoading} />;
	if (sessionError)
		return (
			<LoadingScreen locale={locale} title={t.startupErrorTitle} message={t.startupError} error>
				<button type="button" className="primary" onClick={() => void refetch()}>
					{t.loadRetry}
				</button>
				<Link className="text-button" href={localeHref(locale, "/")}>
					{t.back}
				</Link>
			</LoadingScreen>
		);

	return (
		<div className={`welcome-page ${styles.page}`}>
			<header className="welcome-header">
				<Link href={localeHref(locale, "/")} aria-label={ar ? "الصفحة الرئيسية" : "Home"}>
					<Brand locale={locale} />
				</Link>
				<LanguageSwitch locale={locale} onChange={setLocale} />
			</header>
			<main className={styles.main}>
				<section className={`auth-card ${styles.card}`} aria-labelledby="auth-title">
					<Link className="text-button" href={localeHref(locale, "/")}>
						{ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
						{t.back}
					</Link>
					<h1 id="auth-title" className={styles.title}>
						{title}
					</h1>
					<p>
						{mode === "signup"
							? t.authText
							: ar
								? "مرحبًا بعودتك إلى مساحة أعمالك."
								: "Welcome back to your workspace."}
					</p>
					{sentTo ? (
						<SignupSent locale={locale} email={sentTo} onBack={resetSignup} />
					) : (
						<>
							<form onSubmit={authenticate} aria-busy={busy}>
								<fieldset disabled={busy}>
									{mode === "signup" ? (
										<SignupFields locale={locale} firstInput={firstInput} />
									) : (
										<>
											<Field label={t.email}>
												<input
													ref={firstInput}
													name="email"
													type="email"
													dir="ltr"
													autoComplete="email"
													required
												/>
											</Field>
											{/* Sign-in accepts any stored password; rules apply only when choosing one. */}
											<Field label={t.password}>
												<input
													name="password"
													type="password"
													dir="ltr"
													maxLength={128}
													autoComplete="current-password"
													required
												/>
											</Field>
										</>
									)}
									{error && (
										<p className="error-box" role="alert">
											{error}
										</p>
									)}
									{mode === "signup" && (
										<p className="auth-privacy auth-consent">
											{ar
												? "بإنشاء حسابك فإنك توافق على "
												: "By creating an account you agree to the "}
											<Link href={localeHref(locale, "/terms")}>
												{ar ? "شروط الاستخدام" : "Terms of use"}
											</Link>
											{ar ? " وتقرّ بأنك اطلعت على " : " and acknowledge the "}
											<Link href={localeHref(locale, "/privacy")}>
												{ar ? "إشعار الخصوصية" : "Privacy notice"}
											</Link>
											.
										</p>
									)}
									<button type="submit" className="primary wide" disabled={busy}>
										<ButtonContent loading={busy}>{title}</ButtonContent>
									</button>
								</fieldset>
							</form>
							<Link
								className="text-button auth-switch"
								href={localeHref(
									locale,
									`/${mode === "signup" ? "login" : "signup"}${returnToAdmin ? "?from=admin" : ""}`,
								)}
							>
								{mode === "signup" ? t.switchLogin : t.switchSignup}
							</Link>
							<AuthRecoveryLinks
								locale={locale}
								mode={mode}
								verificationRequired={emailNotVerified}
								emailTaken={emailTaken}
							/>
						</>
					)}
					<span className="auth-privacy">{t.privacy}</span>
				</section>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
