import type { Locale } from "@folio/contracts";
import { LinkArrow } from "@folio/portfolio";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Brand } from "../../components/ui/brand";
import { ProductFooter } from "../../components/ui/product-footer";
import { copy } from "./copy";
import { LandingDetails, LandingShowcase } from "./landing-showcase";

/** Renders the product landing page with links to independent authentication routes. */
export function WelcomeScreen({
	locale,
	localeControl,
	authenticated = false,
}: {
	locale: Locale;
	localeControl: ReactNode;
	authenticated?: boolean;
}) {
	const t = copy[locale];
	const [expandedPreview, setExpandedPreview] = useState(false);
	const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

	/** Opens the shared example at a readable size for the current viewport. */
	function exploreTemplate() {
		setPreviewDevice(window.matchMedia("(max-width: 700px)").matches ? "mobile" : "desktop");
		setExpandedPreview(true);
	}

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
					<Link
						className="secondary"
						href={`/${authenticated ? "studio" : "login"}?lang=${locale}`}
					>
						{authenticated ? (locale === "ar" ? "فتح الاستوديو" : "Open studio") : t.login}
					</Link>
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
							<Link
								className="primary"
								href={`/${authenticated ? "studio" : "signup"}?lang=${locale}`}
							>
								{authenticated ? (locale === "ar" ? "فتح الاستوديو" : "Open studio") : t.signup}
								<LinkArrow locale={locale} />
							</Link>
							<button
								type="button"
								className="text-button"
								aria-haspopup="dialog"
								onClick={exploreTemplate}
							>
								{locale === "ar" ? "جرّب القالب" : "Explore the template"}
							</button>
						</div>
						<p className="landing-note">{t.privacy}</p>
					</div>
					<LandingShowcase
						locale={locale}
						expanded={expandedPreview}
						device={previewDevice}
						onClose={() => setExpandedPreview(false)}
					/>
				</div>
				<LandingDetails locale={locale} authenticated={authenticated} />
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
