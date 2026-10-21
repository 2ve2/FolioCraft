import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../root-styles";
import { isLocale, locales } from "../../../lib/locale";
import { LocaleProvider } from "../../../lib/use-interface-locale";

/** Prebuilds every platform page once per interface language; other prefixes are 404. */
export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}
export const dynamicParams = false;

const descriptions = {
	ar: "مساحة لعرض عملك بطريقتك.",
	en: "A considered home for your work.",
};

/** Localizes the default document metadata for each language. */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	return {
		title: locale === "ar" ? "إيكنارا — استوديو معارض الأعمال" : "Ichnara — Portfolio Studio",
		description: isLocale(locale) ? descriptions[locale] : descriptions.en,
		robots: { index: false, follow: false },
	};
}

/** Renders platform pages with the route language and direction already on the document root. */
export default async function PlatformLayout({
	children,
	params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	return (
		<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<body>
				<LocaleProvider locale={locale}>{children}</LocaleProvider>
			</body>
		</html>
	);
}
