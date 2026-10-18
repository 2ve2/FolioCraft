import type { Draft, Locale, Site } from "@ichnara/contracts";
import { LinkArrow } from "@ichnara/portfolio";
import { Circle, Globe2, Maximize2, Monitor, Smartphone } from "lucide-react";
import { ExpandedPortfolioPreview, PortfolioPreview } from "../portfolio/portfolio-preview";
import { copy } from "./copy";

/** Composes device previews, expansion and the published-page link. */
export function WorkspacePreview({
	draft,
	site,
	locale,
	assetUrls,
	device,
	setDevice,
	mobileTab,
	expandedPreview,
	setExpandedPreview,
}: {
	draft: Draft;
	site: Site;
	locale: Locale;
	assetUrls: Record<string, string>;
	device: "desktop" | "mobile";
	setDevice: (device: "desktop" | "mobile") => void;
	mobileTab: "edit" | "preview";
	expandedPreview: boolean;
	setExpandedPreview: (expanded: boolean) => void;
}) {
	const t = copy[locale];
	return (
		<section
			className={`preview-panel ${mobileTab === "edit" ? "mobile-hidden" : ""}`}
			aria-label={t.preview}
		>
			<div className="preview-toolbar">
				<span>
					<span className="tiny-dot" />
					{t.preview}
				</span>
				<div className="device-controls">
					<button
						type="button"
						aria-label={t.desktop}
						aria-pressed={device === "desktop"}
						className={device === "desktop" ? "active" : ""}
						onClick={() => setDevice("desktop")}
					>
						<Monitor size={16} />
						<span>{t.desktop}</span>
					</button>
					<button
						type="button"
						aria-label={t.mobile}
						aria-pressed={device === "mobile"}
						className={device === "mobile" ? "active" : ""}
						onClick={() => setDevice("mobile")}
					>
						<Smartphone size={16} />
						<span>{t.mobile}</span>
					</button>
				</div>
				<span className="status-pill">{t.draft}</span>
			</div>
			<div className="preview-expand">
				<button type="button" className="text-button" onClick={() => setExpandedPreview(true)}>
					<Maximize2 size={16} />
					{locale === "ar" ? "تكبير المعاينة" : "Expand preview"}
				</button>
			</div>
			{expandedPreview && (
				<ExpandedPortfolioPreview
					draft={draft}
					slug={site.slug}
					assetUrls={assetUrls}
					device={device}
					locale={locale}
					onClose={() => setExpandedPreview(false)}
				/>
			)}
			<div className={`preview-canvas device-${device}`}>
				<div className="browser-bar">
					<div className="browser-dots">
						<i />
						<i />
						<i />
					</div>
					<span dir="ltr">folio / {site.slug}</span>
					<span>
						<Globe2 size={12} />
					</span>
				</div>
				<div className="portfolio-viewport">
					<PortfolioPreview draft={draft} slug={site.slug} assetUrls={assetUrls} device={device} />
				</div>
			</div>
			<p className="preview-caption">
				<Circle size={8} />
				{t.previewHint}
			</p>
			{site.publishedReleaseId && (
				<a className="preview-link" target="_blank" rel="noreferrer" href={`/p/${site.slug}`}>
					{t.openSite}
					<LinkArrow locale={locale} />
				</a>
			)}
		</section>
	);
}
