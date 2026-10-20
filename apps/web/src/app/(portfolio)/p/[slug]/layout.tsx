import type { Metadata } from "next";
import "../../../root-styles";
import { publishedLocale } from "./_public";

export const metadata: Metadata = {
	title: "Ichnara",
	robots: { index: false, follow: false },
};

/** Renders published portfolios with the release language and direction on the document root. */
export default async function PortfolioRootLayout({
	children,
	params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ slug: string }> }>) {
	const locale = await publishedLocale((await params).slug);
	return (
		<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<body>{children}</body>
		</html>
	);
}
