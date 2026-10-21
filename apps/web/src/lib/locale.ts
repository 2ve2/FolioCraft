import type { Locale } from "@ichnara/contracts";

/** Interface languages, each served under its own path prefix (`/ar/...`, `/en/...`). */
export const locales: readonly Locale[] = ["ar", "en"];
/** Used when neither the URL, the saved preference nor the browser names a supported language. */
export const defaultLocale: Locale = "en";
/** Remembers the last interface language for visits to un-prefixed URLs. */
export const localeCookie = "ichnara-locale";

/** Narrows an arbitrary value to a supported interface language. */
export const isLocale = (value: unknown): value is Locale => value === "ar" || value === "en";

/** Prefixes an app path such as "/login", "/admin?x=1" or "/" with the interface language. */
export function localeHref(locale: Locale, path: string): string {
	if (path === "/") return `/${locale}`;
	if (path.startsWith("/?") || path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
	return `/${locale}${path}`;
}

/** Splits "/ar/admin/sites" into its language and the app path ("/admin/sites"). */
export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
	const [, first, ...rest] = pathname.split("/");
	return isLocale(first)
		? { locale: first, path: `/${rest.join("/")}` }
		: { locale: null, path: pathname };
}

/** Picks the preferred supported language from an Accept-Language header. */
export function negotiateLocale(header: string | null | undefined): Locale {
	const ranked = (header ?? "")
		.split(",")
		.map((part, index) => {
			const [tag, ...params] = part.trim().toLowerCase().split(";");
			const quality = params.find((param) => param.trim().startsWith("q="));
			return { tag: tag.split("-")[0], q: quality ? Number(quality.trim().slice(2)) : 1, index };
		})
		.filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
		.sort((a, b) => b.q - a.q || a.index - b.index);
	return (ranked.find((entry) => isLocale(entry.tag))?.tag as Locale | undefined) ?? defaultLocale;
}
