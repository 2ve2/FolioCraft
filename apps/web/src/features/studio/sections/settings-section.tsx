import type { Locale } from "@folio/contracts";
import { ExternalLink } from "lucide-react";
import { Field } from "../../../components/ui/field";
import { SelectControl } from "../../../components/ui/select-control";
import { copy } from "../copy";
import { SiteAddress } from "../site-address";
import type { EditorSectionProps } from "../types";
export function SettingsSection({
	draft,
	site,
	locale,
	update,
	busy,
	renameSite,
	exportDraft,
	importDraft,
	unpublish,
}: EditorSectionProps & {
	busy: boolean;
	renameSite: (slug: string) => Promise<void>;
	exportDraft: () => void;
	importDraft: (file: File) => Promise<void>;
	unpublish: () => Promise<void>;
}) {
	const t = copy[locale];
	return (
		<>
			<div className="section-heading">
				<span className="eyebrow">03 / {t.settings}</span>
				<h1>{t.websiteSettings}</h1>
				<p>{t.draftNote}</p>
			</div>
			<section className="editor-card">
				<SiteAddress slug={site.slug} locale={locale} busy={busy} onSave={renameSite} />
				<Field label={t.siteLanguage} hint={t.settingsHint}>
					<SelectControl
						label={t.siteLanguage}
						value={draft.locale}
						onChange={(value) => update((d) => ({ ...d, locale: value as Locale }))}
						options={[
							{ value: "ar", label: "العربية", code: "AR" },
							{ value: "en", label: "English", code: "EN" },
						]}
					/>
				</Field>
				<button className="secondary wide" type="button" onClick={exportDraft}>
					{t.draftExport}
				</button>
			</section>
			<section className="editor-card">
				<h2>{t.draftImport}</h2>
				<Field label={t.draftImport} hint={t.draftImportHint}>
					<input
						type="file"
						accept=".json,application/json"
						disabled={busy}
						onChange={(event) => {
							const file = event.currentTarget.files?.[0];
							event.currentTarget.value = "";
							if (file) void importDraft(file);
						}}
					/>
				</Field>
			</section>
			<section className="editor-card">
				<h2>{t.published}</h2>
				<p className="muted">{t.unpublishHint}</p>
				{site.publishedReleaseId ? (
					<>
						<a className="secondary wide" href={`/p/${site.slug}`} target="_blank" rel="noreferrer">
							{t.openSite}
							<ExternalLink size={16} />
						</a>
						<button className="danger-button wide" type="button" onClick={() => void unpublish()}>
							{t.unpublish}
						</button>
					</>
				) : (
					<span className="status-pill">{t.draft}</span>
				)}
			</section>
		</>
	);
}
