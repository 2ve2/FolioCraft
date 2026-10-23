"use client";
import type { Locale } from "@ichnara/contracts";
import { CircleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { brandArtwork } from "../../components/ui/brand-artwork";

/** The word's own outline bounds (untransformed v2 artwork) with a 30-unit margin. */
const wordmarkViewBox: Record<Locale, string> = {
	en: "43 -770 3771 810",
	ar: "43 -792 2633 1085",
};

/** Presents real loading/error state without invented progress or replacing the caller's retry action. */
export function LoadingScreen({
	locale,
	message,
	title,
	error = false,
	children,
}: {
	locale: Locale;
	message: string;
	/** A heading naming what went wrong; errors without one fall back to a generic heading. */
	title?: string;
	error?: boolean;
	children?: ReactNode;
}) {
	const ar = locale === "ar";
	const titleId = useId();
	const [takingLonger, setTakingLonger] = useState(false);

	useEffect(() => {
		setTakingLonger(false);
		if (error) return;
		const timer = window.setTimeout(() => setTakingLonger(true), 10000);
		return () => window.clearTimeout(timer);
	}, [error]);

	// Both lockups list the emblem first and the word second; the signature draws the word alone.
	const wordmark = brandArtwork[locale].groups[1];
	const emblem = brandArtwork.en.groups[0];

	return (
		<main className="loading-screen" lang={locale} dir={ar ? "rtl" : "ltr"}>
			<section
				className="loading-content"
				data-state={error ? "error" : "pending"}
				aria-labelledby={titleId}
			>
				<div className="loading-visual" aria-hidden="true">
					<div className="loading-sheet loading-sheet--back" />
					<div className="loading-sheet loading-sheet--front">
						<div className="loading-sheet-top">
							<i />
							<i />
							<i />
						</div>
						<div className="loading-sheet-line" />
						<div className="loading-sheet-line loading-sheet-line--short" />
						<div className="loading-sheet-grid">
							<i />
							<i />
							<i />
						</div>
					</div>
					<svg
						className="loading-symbol"
						aria-hidden="true"
						viewBox="0 0 235 240"
						fill="currentColor"
					>
						{emblem.paths.map((path) => (
							<g key={path.d} className="loading-fold">
								<path {...path} />
							</g>
						))}
					</svg>
				</div>
				{/* While loading the wordmark brands the wait; on an error the heading is the focus. */}
				{!error && (
					<svg
						className="loading-signature"
						width="170"
						height="44"
						viewBox={wordmarkViewBox[locale]}
						fill="currentColor"
						role="img"
						aria-label={ar ? "إيكنارا" : "Ichnara"}
					>
						{wordmark.paths.map((path) => (
							<path key={path.d} d={path.d} />
						))}
					</svg>
				)}
				<h1 id={titleId}>
					{error && <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" />}
					{error
						? (title ?? (ar ? "تعذر إكمال الطلب" : "We couldn’t complete the request"))
						: ar
							? "جارٍ فتح صفحتك…"
							: "Opening your page…"}
				</h1>
				<p className="loading-message" role={error ? "alert" : "status"} aria-atomic="true">
					{message}
				</p>
				{children && <div className="loading-actions">{children}</div>}
				{!error && (
					<p className="loading-help" role="status" aria-atomic="true">
						{takingLonger
							? ar
								? "يستغرق الطلب وقتاً أطول من المعتاد. تحقق من اتصالك بالإنترنت."
								: "This is taking longer than usual. Check your internet connection."
							: ""}
					</p>
				)}
			</section>
		</main>
	);
}
