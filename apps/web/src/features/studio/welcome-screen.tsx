import type { Locale } from "@folio/contracts";
import { LinkArrow } from "@folio/portfolio";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { Brand } from "../../components/ui/brand";
import { Field } from "../../components/ui/field";
import { copy } from "./copy";
import { LandingDetails, LandingShowcase } from "./landing-showcase";

/** Composes the product introduction and real sign-in or signup form. */
export function WelcomeScreen({
	locale,
	localeControl,
	authMode,
	authBusy,
	authError,
	setAuthMode,
	setAuthError,
	authenticate,
}: {
	locale: Locale;
	localeControl: ReactNode;
	authMode: "login" | "signup" | null;
	authBusy: boolean;
	authError: string;
	setAuthMode: (mode: "login" | "signup" | null) => void;
	setAuthError: (error: string) => void;
	authenticate: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
	const t = copy[locale];
	const formArea = useRef<HTMLElement>(null);
	useEffect(() => {
		if (authMode) {
			formArea.current?.scrollIntoView({ block: "nearest" });
			formArea.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
		}
	}, [authMode]);
	return (
		<div className="welcome-page">
			<header className="welcome-header">
				<Brand />
				<nav
					className="welcome-nav"
					aria-label={locale === "ar" ? "القائمة الرئيسية" : "Main navigation"}
				>
					<a className="welcome-how" href="#how-it-works">
						{locale === "ar" ? "كيف يعمل" : "How it works"}
					</a>
					{localeControl}
					<button type="button" className="secondary" onClick={() => setAuthMode("login")}>
						{t.login}
					</button>
				</nav>
			</header>
			<main>
				<div className="welcome-main">
					<div className="welcome-story">
						<span className="eyebrow">
							<span className="tiny-dot" />
							{t.eyebrow}
						</span>
						<h1>{t.tagline}</h1>
						<p>{t.intro}</p>
						<div className="landing-actions">
							<button type="button" className="primary" onClick={() => setAuthMode("signup")}>
								{t.signup}
								<LinkArrow locale={locale} />
							</button>
							{!authMode && (
								<a className="text-button" href="#example">
									{locale === "ar" ? "جرّب القالب" : "Explore the template"}
								</a>
							)}
						</div>
						<p className="landing-note">{t.privacy}</p>
					</div>
					{!authMode ? (
						<LandingShowcase locale={locale} />
					) : (
						<section className="auth-card" ref={formArea} id="get-started">
							<button
								type="button"
								className="text-button"
								onClick={() => {
									setAuthMode(null);
									setAuthError("");
								}}
							>
								{locale === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
								{t.back}
							</button>
							<h2>{authMode === "signup" ? t.signup : t.login}</h2>
							<form onSubmit={authenticate}>
								{authMode === "signup" && (
									<Field label={t.authName}>
										<input name="name" dir="auto" autoComplete="name" required maxLength={100} />
									</Field>
								)}
								<Field label={t.email}>
									<input name="email" type="email" dir="ltr" autoComplete="email" required />
								</Field>
								<Field label={t.password} hint={t.authHint}>
									<input
										name="password"
										type="password"
										dir="ltr"
										minLength={10}
										maxLength={128}
										autoComplete={authMode === "signup" ? "new-password" : "current-password"}
										required
									/>
								</Field>
								{authError && (
									<p className="error-box" role="alert">
										{authError}
									</p>
								)}
								<button type="submit" className="primary wide" disabled={authBusy}>
									{authBusy ? (
										<LoaderCircle className="spin" size={18} />
									) : authMode === "signup" ? (
										t.signup
									) : (
										t.login
									)}
								</button>
							</form>
							<button
								type="button"
								className="text-button auth-switch"
								onClick={() => {
									setAuthMode(authMode === "login" ? "signup" : "login");
									setAuthError("");
								}}
							>
								{authMode === "signup" ? t.switchLogin : t.switchSignup}
							</button>
						</section>
					)}
				</div>
				<LandingDetails locale={locale} onStart={() => setAuthMode("signup")} />
			</main>
			<footer className="welcome-footer">
				<span>FolioCraft © 2026</span>
				<span>{t.footer}</span>
			</footer>
		</div>
	);
}
