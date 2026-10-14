import type { Locale } from "@folio/contracts";
import { ArrowUpRight, Globe2, LoaderCircle } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Brand } from "../../components/ui/brand";
import { Field } from "../../components/ui/field";
import { SelectControl } from "../../components/ui/select-control";
import { copy } from "./copy";
export function OnboardingScreen({
	locale,
	localeControl,
	role,
	busy,
	error,
	logout,
	createSite,
}: {
	locale: Locale;
	localeControl: ReactNode;
	role?: string | null;
	busy: boolean;
	error: string;
	logout: () => Promise<void>;
	createSite: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
	const t = copy[locale];
	return (
		<div className="welcome-page">
			<header className="welcome-header">
				<Brand />
				<div className="header-actions">
					{localeControl}
					{role?.split(",").includes("admin") && (
						<a className="secondary" href="/admin">
							{t.admin}
						</a>
					)}
					<button
						type="button"
						className="text-button"
						disabled={busy}
						onClick={() => void logout()}
					>
						{t.logout}
					</button>
				</div>
			</header>
			<main className="onboarding">
				<span className="large-mark">
					<Globe2 size={30} />
				</span>
				<span className="eyebrow">01 / {t.workspace}</span>
				<h1>{t.createTitle}</h1>
				<p>{t.createText}</p>
				<form className="onboarding-card" onSubmit={createSite}>
					<Field label={t.slug} hint={t.slugHint}>
						<div className="slug-input" dir="ltr">
							<span>/p/</span>
							<input
								name="slug"
								autoComplete="off"
								pattern="[a-z0-9]+(-[a-z0-9]+)*"
								minLength={3}
								maxLength={50}
								placeholder="your-name"
								required
							/>
						</div>
					</Field>
					<Field label={t.createLanguage}>
						<SelectControl
							name="locale"
							label={t.createLanguage}
							defaultValue={locale}
							options={[
								{ value: "ar", label: "العربية", code: "AR" },
								{ value: "en", label: "English", code: "EN" },
							]}
						/>
					</Field>
					{error && (
						<p className="error-box" role="alert">
							{error}
						</p>
					)}
					<button type="submit" className="primary wide" disabled={busy}>
						{busy ? <LoaderCircle className="spin" size={18} /> : t.create}
						<ArrowUpRight size={18} />
					</button>
					<small className="auth-privacy">{t.privacy}</small>
				</form>
			</main>
		</div>
	);
}
