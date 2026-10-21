import type { Metadata } from "next";
import { NotFoundScreen } from "../features/not-found/not-found-screen";
import { requestLocale } from "../lib/request-locale";
import { LocaleProvider } from "../lib/use-interface-locale";
import "./root-styles";

/** Titles the page in the same language as its content. */
export async function generateMetadata(): Promise<Metadata> {
	const locale = await requestLocale();
	return {
		title: locale === "ar" ? "404 — إيكنارا" : "404 — Ichnara",
		robots: { index: false, follow: false },
	};
}

/** Renders the branded page for unmatched URLs in the visitor's interface language. */
export default async function GlobalNotFound() {
	const locale = await requestLocale();
	return (
		<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<body>
				<LocaleProvider locale={locale}>
					<NotFoundScreen />
				</LocaleProvider>
			</body>
		</html>
	);
}
