import type { Locale } from "@folio/contracts";
import { ArrowUpRight, Check, ChevronLeft, LoaderCircle, Sparkles } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Brand } from "../../components/ui/brand";
import { Field } from "../../components/ui/field";
import { copy } from "./copy";
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
	return (
		<div className="welcome-page">
			<header className="welcome-header">
				<Brand />
				{localeControl}
			</header>
			<main className="welcome-main">
				<div className="welcome-story">
					<span className="eyebrow">
						<span className="tiny-dot" />
						{t.eyebrow}
					</span>
					<h1>{t.tagline}</h1>
					<p>{t.intro}</p>
					<div className="journey">
						<small>{t.journey}</small>
						{[t.stepOne, t.stepTwo, t.stepThree].map((label, index) => (
							<span key={label}>
								<b>0{index + 1}</b>
								{label}
								<Check size={16} />
							</span>
						))}
					</div>
				</div>
				<section className="auth-card">
					{!authMode ? (
						<>
							<span className="large-mark">
								<Sparkles size={30} />
							</span>
							<h2>{t.authIntro}</h2>
							<p>{t.authText}</p>
							<button type="button" className="primary wide" onClick={() => setAuthMode("signup")}>
								{t.signup}
								<ArrowUpRight size={18} />
							</button>
							<button type="button" className="secondary wide" onClick={() => setAuthMode("login")}>
								{t.login}
							</button>
							<small className="auth-privacy">{t.privacy}</small>
						</>
					) : (
						<>
							<button
								type="button"
								className="text-button"
								onClick={() => {
									setAuthMode(null);
									setAuthError("");
								}}
							>
								<ChevronLeft size={16} />
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
						</>
					)}
				</section>
			</main>
			<footer className="welcome-footer">
				<span>FolioCraft © 2026</span>
				<span>{t.footer}</span>
			</footer>
		</div>
	);
}
