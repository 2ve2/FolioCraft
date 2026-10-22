"use client";
import type { Locale } from "@ichnara/contracts";
import { type ReactNode, useEffect, useState } from "react";
import { copy } from "./copy";
import { ContentHeader } from "./sections/content-header";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspacePreview } from "./workspace-preview";
import { WorkspaceSidebar } from "./workspace-sidebar";

/** Disabled startup controls retain the real workspace's dimensions without account data. */
const unavailable = () => {};
const unavailableOperation = async () => {};

/** Shows public workspace chrome immediately, keeping all account and draft areas neutral. */
export function StudioSkeleton({
	locale,
	localeControl,
}: {
	locale: Locale;
	localeControl: ReactNode;
}) {
	const t = copy[locale];
	const [takingLonger, setTakingLonger] = useState(false);
	useEffect(() => {
		const timer = window.setTimeout(() => setTakingLonger(true), 10000);
		return () => window.clearTimeout(timer);
	}, []);
	return (
		<>
			<p className="studio-loading-status" role="status" aria-atomic="true">
				{takingLonger ? t.studioTakingLonger : t.studioLoading}
			</p>
			<div
				className="studio-shell studio-shell--split-scroll studio-skeleton"
				aria-busy="true"
				lang={locale}
				dir={locale === "ar" ? "rtl" : "ltr"}
			>
				<WorkspaceSidebar
					locale={locale}
					user={null}
					section="content"
					setSection={unavailable}
					setMobileTab={unavailable}
					busy
					logout={unavailableOperation}
					openAdministration={unavailableOperation}
				/>
				<div className="studio-main">
					<WorkspaceHeader
						locale={locale}
						localeControl={localeControl}
						section="content"
						saveState="saved"
						busy
						loading
						publish={unavailableOperation}
					/>
					<div className="mobile-tabs">
						<button type="button" className="active" disabled>
							{t.edit}
						</button>
						<button type="button" disabled>
							{t.preview}
						</button>
					</div>
					<div className="editor-layout">
						<div className="editor-panel">
							<div aria-hidden="true" className="studio-skeleton-editor">
								<ContentHeader locale={locale} loading />
								<div className="editor-card studio-skeleton-card">
									<div className="studio-placeholder studio-placeholder--heading" />
									<div className="studio-placeholder studio-placeholder--field" />
									<div className="studio-placeholder studio-placeholder--field" />
									<div className="studio-placeholder studio-placeholder--body" />
								</div>
							</div>
						</div>
						<WorkspacePreview
							draft={null}
							site={null}
							locale={locale}
							assetUrls={{}}
							device="desktop"
							setDevice={unavailable}
							mobileTab="edit"
							expandedPreview={false}
							setExpandedPreview={unavailable}
						/>
					</div>
				</div>
			</div>
		</>
	);
}
