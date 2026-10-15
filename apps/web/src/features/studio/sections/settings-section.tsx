import type { Locale } from "@folio/contracts";
import { LinkArrow } from "@folio/portfolio";
import { useEffect, useRef, useState } from "react";
import { Field } from "../../../components/ui/field";
import { SelectControl } from "../../../components/ui/select-control";
import { copy } from "../copy";
import { DraftImportError, readDraftBackup } from "../draft-import";
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
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [reading, setReading] = useState(false);
	const [fileError, setFileError] = useState<"size" | "invalid" | null>(null);
	const selection = useRef(0);
	const fileInput = useRef<HTMLInputElement>(null);
	useEffect(
		() => () => {
			selection.current += 1;
		},
		[],
	);
	/** Validates the chosen file without applying it until the user confirms in this screen. */
	async function selectBackup(file: File) {
		const version = ++selection.current;
		setReading(true);
		setPendingFile(null);
		setFileError(null);
		try {
			await readDraftBackup(file);
			if (version === selection.current) setPendingFile(file);
		} catch (error) {
			if (version === selection.current)
				setFileError(error instanceof DraftImportError ? error.reason : "invalid");
		} finally {
			if (version === selection.current) setReading(false);
		}
	}
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
				<p className="muted">{t.draftImportHint}</p>
				<button
					type="button"
					className="secondary wide"
					disabled={busy || reading}
					onClick={() => fileInput.current?.click()}
				>
					{reading ? t.draftImportReading : t.draftImportChoose}
				</button>
				<input
					type="file"
					ref={fileInput}
					hidden
					aria-label={t.draftImportChoose}
					accept=".json,application/json"
					disabled={busy || reading}
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];
						event.currentTarget.value = "";
						if (file) void selectBackup(file);
					}}
				/>
				{fileError && (
					<p role="alert">{fileError === "size" ? t.draftImportSize : t.draftImportInvalid}</p>
				)}
				{pendingFile && (
					<fieldset aria-label={t.draftImportConfirm}>
						<p>
							<strong dir="auto">{pendingFile.name}</strong>
						</p>
						<p>{t.draftImportConfirm}</p>
						<button
							type="button"
							className="primary wide"
							disabled={busy}
							onClick={async () => {
								await importDraft(pendingFile);
								setPendingFile(null);
							}}
						>
							{t.draftImportApply}
						</button>
						<button
							type="button"
							className="secondary wide"
							disabled={busy}
							onClick={() => setPendingFile(null)}
						>
							{t.draftImportCancel}
						</button>
					</fieldset>
				)}
			</section>
			<section className="editor-card">
				<h2>{t.published}</h2>
				<p className="muted">{t.unpublishHint}</p>
				{site.publishedReleaseId ? (
					<>
						<a className="secondary wide" href={`/p/${site.slug}`} target="_blank" rel="noreferrer">
							{t.openSite}
							<LinkArrow locale={locale} />
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
