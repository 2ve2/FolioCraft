"use client";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { AdminPanel } from "../management/admin/admin-panel";
import { SiteOperations } from "../management/site/site-operations";
import { LoadingScreen } from "./loading-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { AppearanceSection } from "./sections/appearance-section";
import { ContentSection } from "./sections/content-section";
import { SettingsSection } from "./sections/settings-section";
import { useStudioController } from "./use-studio-controller";
import { WelcomeScreen } from "./welcome-screen";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspacePreview } from "./workspace-preview";
import { WorkspaceSidebar } from "./workspace-sidebar";

/** Selects the authenticated workspace screen and composes its editing sections. */
export function Studio() {
	const {
		locale,
		setLocale,
		t,
		session,
		isPending,
		sessionError,
		refetchSession,
		site,
		draft,
		loaded,
		loadError,
		loadedIdentity,
		sessionIdentity,
		loadSite,
		section,
		setSection,
		saveState,
		error,
		setError,
		notice,
		busy,
		mobileTab,
		setMobileTab,
		device,
		setDevice,
		expandedPreview,
		setExpandedPreview,
		assetUrls,
		update,
		createSite,
		publish,
		unpublish,
		logout,
		renameSite,
		exportDraft,
		importDraft,
		publicationChanged,
		operationsBusy,
		flush,
		requestSavedReload,
	} = useStudioController();
	const localeControl = <LanguageSwitch locale={locale} onChange={setLocale} />;
	if (isPending) return <LoadingScreen locale={locale} message={t.authLoading} />;
	if (sessionError)
		return (
			<LoadingScreen locale={locale} message={t.startupError} error>
				<button type="button" className="primary" onClick={() => void refetchSession()}>
					{t.loadRetry}
				</button>
			</LoadingScreen>
		);

	if (!session?.user) return <WelcomeScreen locale={locale} localeControl={localeControl} />;

	if (!loaded || loadError || loadedIdentity !== sessionIdentity)
		return (
			<LoadingScreen
				locale={locale}
				message={loadError ? t.loadError : t.loading}
				error={loadError}
			>
				{loadError && (
					<>
						<button type="button" className="primary" onClick={() => void loadSite(true)}>
							{t.loadRetry}
						</button>
						<button
							type="button"
							className="text-button"
							disabled={busy}
							onClick={() => void logout()}
						>
							{t.logout}
						</button>
					</>
				)}
			</LoadingScreen>
		);

	if (!site || !draft)
		return (
			<OnboardingScreen
				locale={locale}
				localeControl={localeControl}
				role={session.user.role}
				busy={busy}
				error={error}
				logout={logout}
				createSite={createSite}
			/>
		);

	const controls = (
		<>
			{section === "content" && (
				<ContentSection
					draft={draft}
					site={site}
					locale={locale}
					update={update}
					setError={setError}
				/>
			)}
			{section === "operations" && (
				<>
					<div className="section-heading">
						<span className="eyebrow">04 / {t.operations}</span>
						<h1>{t.operations}</h1>
						<p>
							{locale === "ar"
								? "تابع الاستفسارات وراجع الإصدارات المنشورة من مكان واحد."
								: "Manage inquiries and review published releases in one place."}
						</p>
					</div>
					<SiteOperations
						site={site}
						locale={locale}
						onPublicationChange={publicationChanged}
						disabled={busy || saveState === "saving"}
						onBusyChange={operationsBusy}
					/>
				</>
			)}
			{section === "admin" && <AdminPanel locale={locale} />}
			{section === "appearance" && (
				<AppearanceSection draft={draft} locale={locale} update={update} />
			)}
			{section === "settings" && (
				<SettingsSection
					draft={draft}
					site={site}
					locale={locale}
					update={update}
					busy={busy}
					renameSite={renameSite}
					exportDraft={exportDraft}
					importDraft={importDraft}
					unpublish={unpublish}
				/>
			)}
		</>
	);
	return (
		<div className="studio-shell studio-shell--split-scroll">
			<WorkspaceSidebar
				locale={locale}
				user={session.user}
				section={section}
				setSection={setSection}
				setMobileTab={setMobileTab}
				busy={busy}
				logout={logout}
			/>
			<div className="studio-main">
				<WorkspaceHeader
					locale={locale}
					localeControl={localeControl}
					section={section}
					saveState={saveState}
					busy={busy}
					publish={publish}
				/>
				<div className="mobile-tabs">
					<button
						type="button"
						className={mobileTab === "edit" ? "active" : ""}
						onClick={() => setMobileTab("edit")}
					>
						{t.edit}
					</button>
					<button
						type="button"
						className={mobileTab === "preview" ? "active" : ""}
						onClick={() => setMobileTab("preview")}
					>
						{t.preview}
					</button>
				</div>
				{(error || notice) && (
					<div
						className={`feedback ${error ? "feedback-error" : "feedback-success"}`}
						role={error ? "alert" : "status"}
					>
						<p>{error || notice}</p>
						{error && notice && (
							<p className="feedback-operation-notice" role="status">
								{notice}
							</p>
						)}
						{error && (
							<div className="feedback-actions">
								<button
									type="button"
									className="text-button"
									disabled={busy}
									onClick={() => void flush().catch(() => undefined)}
								>
									{t.retry}
								</button>
								<button type="button" className="text-button" onClick={exportDraft}>
									{t.draftExport}
								</button>
								<button
									type="button"
									className="text-button"
									disabled={busy || saveState === "saving"}
									onClick={() => {
										requestSavedReload();
									}}
								>
									{t.reload}
								</button>
							</div>
						)}
					</div>
				)}
				<div className="editor-layout">
					<div className={`editor-panel ${mobileTab === "preview" ? "mobile-hidden" : ""}`}>
						<fieldset disabled={busy}>{controls}</fieldset>
						<div className="editor-bottom">
							<span>{t.draftNote}</span>
							<button
								type="button"
								className="text-button"
								disabled={busy || saveState === "saved"}
								onClick={() => void flush().catch(() => undefined)}
							>
								{t.save}
							</button>
						</div>
					</div>
					<WorkspacePreview
						draft={draft}
						site={site}
						locale={locale}
						assetUrls={assetUrls}
						device={device}
						setDevice={setDevice}
						mobileTab={mobileTab}
						expandedPreview={expandedPreview}
						setExpandedPreview={setExpandedPreview}
					/>
				</div>
			</div>
		</div>
	);
}
