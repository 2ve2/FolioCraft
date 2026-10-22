import type { Metadata } from "next";
import "../../../root-styles";
import { requestLocale } from "../../../../lib/request-locale";
import { LocaleProvider } from "../../../../lib/use-interface-locale";
import { publishedLocale } from "./_public";

/** Default title for portfolio routes that do not set their own (the release page does). */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const locale = (await publishedLocale((await params).slug)) ?? (await requestLocale());
	return {
		title: locale === "ar" ? "إيكنارا" : "Ichnara",
		robots: { index: false, follow: false },
	};
}

/**
 * Renders published portfolios in the release language and direction. When the release
 * cannot be read (missing or unavailable), platform messages use the visitor's language.
 */
export default async function PortfolioRootLayout({
	children,
	params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ slug: string }> }>) {
	const published = await publishedLocale((await params).slug);
	const locale = published ?? (await requestLocale());
	return (
		<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<body>
				{/* The portfolio's language must not overwrite the visitor's interface preference. */}
				<LocaleProvider locale={locale} remember={false} pinned={Boolean(published)}>
					{children}
				</LocaleProvider>
			</body>
		</html>
	);
}
