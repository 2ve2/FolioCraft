import { type Locale, slugSchema } from "@ichnara/contracts";
import { isStaff } from "@ichnara/contracts/admin-policy";
import { LinkArrow } from "@ichnara/portfolio";
import { Globe2 } from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { Brand } from "../../components/ui/brand";
import { ButtonContent } from "../../components/ui/button-content";
import { Field } from "../../components/ui/field";
import { SelectControl } from "../../components/ui/select-control";
import { copy } from "./copy";

/** Validates a portfolio address before submitting site creation. */
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
	const [invalidAddress, setInvalidAddress] = useState(false);
	const address = useRef<HTMLInputElement>(null);
	return (
		<div className="welcome-page">
			<header className="welcome-header">
				<Brand locale={locale} />
				<div className="header-actions">
					{localeControl}
					{isStaff(role) && (
						<a className="secondary" href={`/admin?lang=${locale}`}>
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
				<form
					className="onboarding-card"
					noValidate
					aria-busy={busy}
					onSubmit={(event) => {
						const valid = slugSchema.safeParse(address.current?.value.trim().toLowerCase()).success;
						setInvalidAddress(!valid);
						if (!valid) {
							event.preventDefault();
							address.current?.focus();
							return;
						}
						void createSite(event);
					}}
				>
					<Field label={t.slug}>
						<div className="slug-input" dir="ltr">
							<span>/p/</span>
							<input
								name="slug"
								ref={address}
								disabled={busy}
								aria-invalid={invalidAddress || undefined}
								aria-describedby="address-help"
								autoCapitalize="none"
								spellCheck={false}
								onChange={() => setInvalidAddress(false)}
								autoComplete="off"
								pattern="[a-z0-9]+(-[a-z0-9]+)*"
								minLength={3}
								maxLength={50}
								placeholder="your-name"
								required
							/>
						</div>
					</Field>
					<p
						id="address-help"
						className={invalidAddress ? "error-box" : "onboarding-hint"}
						role={invalidAddress ? "alert" : undefined}
					>
						{invalidAddress ? t.slugError : t.slugHint}
					</p>
					<Field label={t.createLanguage}>
						<SelectControl
							name="locale"
							disabled={busy}
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
						<ButtonContent loading={busy}>
							{t.create}
							<LinkArrow locale={locale} />
						</ButtonContent>
					</button>
					<small className="auth-privacy">{t.privacy}</small>
				</form>
			</main>
		</div>
	);
}
