import type { Draft } from "@ichnara/contracts";
import { portfolioFontNames, portfolioTextSizes } from "@ichnara/portfolio";
import { Check, Sparkles } from "lucide-react";
import { Field } from "../../../components/ui/field";
import { SelectControl } from "../../../components/ui/select-control";
import { TooltipButton } from "../../../components/ui/tooltip-button";
import { copy } from "../copy";
import type { EditorSectionProps } from "../types";

/** Edits appearance preferences without rewriting portfolio content. */
export function AppearanceSection({ draft, locale, update }: Omit<EditorSectionProps, "site">) {
	const t = copy[locale];

	/** Updates one visual preference and synchronizes project visibility compatibility. */
	const changeAppearance = (key: keyof Draft["appearance"], value: string | boolean) =>
		update({
			...draft,
			appearance: { ...draft.appearance, [key]: value },
			...(key === "projectsVisible"
				? { sectionVisibility: { ...draft.sectionVisibility, projects: Boolean(value) } }
				: {}),
		});

	return (
		<>
			<div className="section-heading">
				<span className="eyebrow">02 / {t.appearance}</span>
				<h1>{t.theme}</h1>
				<p>{t.themeDesc}</p>
			</div>
			<section className="editor-card">
				<h2>{t.appearance}</h2>
				<div className="theme-grid">
					{(["light", "dark", "editorial"] as const).map((theme) => (
						<button
							type="button"
							key={theme}
							className={`theme-choice ${draft.appearance.theme === theme ? "selected" : ""}`}
							aria-pressed={draft.appearance.theme === theme}
							onClick={() => changeAppearance("theme", theme)}
						>
							<span className={`theme-swatch swatch-${theme}`}>
								<i />
								<i />
								<i />
							</span>
							<span>
								{t[theme]}
								{draft.appearance.theme === theme && <Check size={15} />}
							</span>
						</button>
					))}
				</div>
				<Field label={t.font}>
					<SelectControl
						label={t.font}
						value={draft.appearance.font}
						onChange={(value) => changeAppearance("font", value)}
						options={(["sans", "serif", "mono"] as const).map((font) => ({
							value: font,
							label: t[font],
							description: portfolioFontNames[font],
						}))}
					/>
				</Field>
				<Field label={t.size}>
					<SelectControl
						label={t.size}
						value={draft.appearance.size}
						onChange={(value) => changeAppearance("size", value)}
						options={(["small", "medium", "large"] as const).map((size) => ({
							value: size,
							label: `${t[size]} · ${portfolioTextSizes[size]}`,
						}))}
					/>
				</Field>
				<div className="field">
					<span>{t.accent}</span>
					<div className="accent-grid">
						{(["violet", "blue", "green", "rose"] as const).map((accent) => (
							<TooltipButton
								key={accent}
								type="button"
								aria-label={t[accent]}
								hint={t[accent]}
								aria-pressed={draft.appearance.accent === accent}
								className={`accent-chip accent-${accent} ${draft.appearance.accent === accent ? "selected" : ""}`}
								onClick={() => changeAppearance("accent", accent)}
							>
								{draft.appearance.accent === accent ? <Check size={16} /> : <span />}
							</TooltipButton>
						))}
					</div>
				</div>
				{(
					[
						["profileVisualVisible", t.showProfileVisual],
						["projectFallbackVisible", t.showProjectFallback],
					] as const
				).map(([key, label]) => (
					<label className="switch-row" key={key}>
						<input
							type="checkbox"
							checked={draft.appearance[key] !== false}
							onChange={(event) => changeAppearance(key, event.target.checked)}
						/>
						<span>{label}</span>
					</label>
				))}
				<label className="switch-row">
					<input
						type="checkbox"
						checked={draft.appearance.projectsVisible}
						onChange={(e) => changeAppearance("projectsVisible", e.target.checked)}
					/>
					<span>{t.showProjects}</span>
				</label>
			</section>
			<div className="quiet-note">
				<Sparkles size={18} />
				<p>{t.themeDesc}</p>
			</div>
		</>
	);
}
