"use client";
import Link from "next/link";
import { Brand } from "../../components/ui/brand";
import { ButtonContent } from "../../components/ui/button-content";
import { Field } from "../../components/ui/field";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { LoadingScreen } from "../studio/loading-screen";
import styles from "./auth.module.css";
import type { RecoveryMode } from "./recovery-request";
import { useRecoveryController } from "./use-recovery-controller";

/** Presents bilingual native recovery/resend forms independently of the signed-in workspace. */
export function RecoveryScreen({ mode }: { mode: RecoveryMode }) {
	const {
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
	} = useRecoveryController(mode);
	if (!ready) return <LoadingScreen locale={locale} localeReady={ready} message={t.loading} />;
	return (
		<div className={`welcome-page ${styles.page}`}>
			<header className="welcome-header">
				<Link href={`/?lang=${locale}`} aria-label={locale === "ar" ? "الرئيسية" : "Home"}>
					<Brand locale={locale} />
				</Link>
				<LanguageSwitch locale={locale} onChange={setLocale} />
			</header>
			<main className={styles.main}>
				<section className={`auth-card ${styles.card}`} aria-labelledby="recovery-title">
					<h1 id="recovery-title" className={styles.title}>
						{t[mode]}
					</h1>
					<p>{t.intro}</p>
					{mode === "verify" && callbackError && (
						<p role="alert" className="error-box">
							{t.invalid}
						</p>
					)}
					{mode === "verify" && returned && <p role="status">{t.verificationReturn}</p>}
					{mode === "reset" && !token && !success && (
						<p role="alert" className="error-box">
							{t.invalid}
						</p>
					)}
					{!success && (
						<form onSubmit={submit} aria-busy={busy}>
							<fieldset disabled={busy || (mode === "reset" && !token)}>
								{mode === "reset" ? (
									<>
										<Field label={t.password}>
											<input
												name="password"
												type="password"
												dir="ltr"
												autoComplete="new-password"
												minLength={10}
												maxLength={128}
												required
											/>
										</Field>
										<Field label={t.confirm}>
											<input
												name="confirm"
												type="password"
												dir="ltr"
												autoComplete="new-password"
												minLength={10}
												maxLength={128}
												required
											/>
										</Field>
									</>
								) : (
									<Field label={t.email}>
										<input name="email" type="email" dir="ltr" autoComplete="email" required />
									</Field>
								)}
								{error && (
									<p className="error-box" role="alert">
										{error}
									</p>
								)}
								<button type="submit" className="primary wide" disabled={busy}>
									<ButtonContent loading={busy}>
										{mode === "reset" ? t.reset : t.send}
									</ButtonContent>
								</button>
							</fieldset>
						</form>
					)}
					{success && <p role="status">{mode === "reset" ? t.resetDone : t.accepted}</p>}
					{mode === "reset" && (
						<Link className="text-button auth-switch" href={`/forgot-password?lang=${locale}`}>
							{t.forgotLink}
						</Link>
					)}
					<Link className="text-button auth-switch" href={`/login?lang=${locale}`}>
						{t.login}
					</Link>
				</section>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
