import type { Locale } from "@ichnara/contracts";
import type { Metadata } from "next";
import { defaultLocale, isLocale } from "./locale";

/**
 * Builds a page's `generateMetadata` with its title in the route language, so the browser
 * tab never shows the other language. Extra metadata applies to both languages.
 */
export function localizedMetadata(titles: Record<Locale, string>, extra: Metadata = {}) {
	return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
		const { locale } = await params;
		return { ...extra, title: titles[isLocale(locale) ? locale : defaultLocale] };
	};
}
