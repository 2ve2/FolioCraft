"use client";

/** Shows recoverable public-read failure feedback without fabricating content. */
export default function PortfolioUnavailable({ reset }: { error: Error; reset: () => void }) {
	return (
		<main className="public-error">
			<h1>تعذر تحميل الموقع · Portfolio unavailable</h1>
			<p>
				تعذر تحميل النسخة المنشورة. حاول مجددًا لاحقًا.
				<br />
				The published portfolio is unavailable. Please try again later.
			</p>
			<button type="button" className="secondary" onClick={reset}>
				إعادة المحاولة · Try again
			</button>
		</main>
	);
}
