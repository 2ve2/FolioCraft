"use client";

import { useInterfaceLocale } from "../../../../../lib/use-interface-locale";

const text = {
	ar: {
		title: "تعذر تحميل الموقع",
		body: "تعذر تحميل النسخة المنشورة. حاول مجددًا بعد قليل.",
		retry: "إعادة المحاولة",
	},
	en: {
		title: "Portfolio unavailable",
		body: "The published portfolio could not be loaded. Please try again shortly.",
		retry: "Try again",
	},
};

/** Shows recoverable public-read failure feedback in one language, without fabricating content. */
export default function PortfolioUnavailable({ reset }: { error: Error; reset: () => void }) {
	const [locale] = useInterfaceLocale();
	const t = text[locale];
	return (
		<main className="public-error" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<h1>{t.title}</h1>
			<p>{t.body}</p>
			<button type="button" className="secondary" onClick={reset}>
				{t.retry}
			</button>
		</main>
	);
}
