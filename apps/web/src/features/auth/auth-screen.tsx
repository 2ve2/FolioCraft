"use client";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Brand } from "../../components/ui/brand";
import { Field } from "../../components/ui/field";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { LoadingScreen } from "../studio/loading-screen";
import styles from "./auth.module.css";
import { type AuthMode, useAuthController } from "./use-auth-controller";

/** Renders a dedicated authentication page without landing-page content or examples. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
	const {
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
		returnToAdmin,
		authenticate,
	} = useAuthController(mode);
	const firstInput = useRef<HTMLInputElement>(null);
	const ar = locale === "ar";
	const title = mode === "signup" ? t.signup : t.login;

	useEffect(() => {
		if (!isPending && !session && !sessionError) firstInput.current?.focus();
	}, [isPending, session, sessionError]);

	if (isPending || session?.user) return <LoadingScreen locale={locale} message={t.authLoading} />;
	if (sessionError)
		return (
			<LoadingScreen locale={locale} message={t.startupError} error>
				<button type="button" className="primary" onClick={() => void refetch()}>
					{t.loadRetry}
				</button>
				<Link className="text-button" href={`/?lang=${locale}`}>
					{t.back}
				</Link>
			</LoadingScreen>
		);

	return (
		<div className={`welcome-page ${styles.page}`}>
			<header className="welcome-header">
				<Link href={`/?lang=${locale}`} aria-label={ar ? "الصفحة الرئيسية" : "Home"}>
					<Brand />
				</Link>
				<LanguageSwitch locale={locale} onChange={setLocale} />
			</header>
			<main className={styles.main}>
				<section className={`auth-card ${styles.card}`} aria-labelledby="auth-title">
					<Link className="text-button" href={`/?lang=${locale}`}>
						{ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
						{t.back}
					</Link>
					<span className={`eyebrow ${styles.eyebrow}`}>Ichnara</span>
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
					<form onSubmit={authenticate} aria-busy={busy}>
						<fieldset disabled={busy}>
							{mode === "signup" && (
								<Field label={t.authName}>
									<input
										ref={firstInput}
										name="name"
										dir="auto"
										autoComplete="name"
										required
										maxLength={100}
									/>
								</Field>
							)}
							<Field label={t.email}>
								<input
									ref={mode === "login" ? firstInput : undefined}
									name="email"
									type="email"
									dir="ltr"
									autoComplete="email"
									required
								/>
							</Field>
							<Field label={t.password} hint={t.authHint}>
								<input
									name="password"
									type="password"
									dir="ltr"
									minLength={10}
									maxLength={128}
									autoComplete={mode === "signup" ? "new-password" : "current-password"}
									required
								/>
							</Field>
							{error && (
								<p className="error-box" role="alert">
									{error}
								</p>
							)}
							{verificationRequired && (
								<p className="auth-privacy" role="status">
									{ar
										? "تم إنشاء الحساب. يلزم تأكيد البريد الإلكتروني قبل تسجيل الدخول."
										: "Account created. Verify your email address before signing in."}
								</p>
							)}
							<button type="submit" className="primary wide" disabled={busy}>
								{busy && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
								{title}
							</button>
						</fieldset>
					</form>
					<Link
						className="text-button auth-switch"
						href={`/${mode === "signup" ? "login" : "signup"}?lang=${locale}${returnToAdmin ? "&from=admin" : ""}`}
					>
						{mode === "signup" ? t.switchLogin : t.switchSignup}
					</Link>
					<span className="auth-privacy">{t.privacy}</span>
				</section>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
