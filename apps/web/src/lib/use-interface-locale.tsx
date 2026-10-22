"use client";
import type { Locale } from "@ichnara/contracts";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect } from "react";
import { defaultLocale, localeCookie, localeHref, splitLocalePath } from "./locale";

const LocaleContext = createContext<Locale>(defaultLocale);
const LocalePinnedContext = createContext(false);

/** Saves the interface language for requests that do not carry it in the path. */
function rememberLocale(locale: Locale) {
	const secure = window.location.protocol === "https:" ? "; secure" : "";
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not available in every supported browser.
	document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax${secure}`;
}

/**
 * Supplies the route's interface language, resolved on the server, to client components, and
 * remembers it so un-prefixed URLs (e.g. "/") redirect to the same language next time.
 */
export function LocaleProvider({
	locale,
	remember = true,
	pinned = false,
	children,
}: {
	locale: Locale;
	remember?: boolean;
	/** The language is fixed by content (a published portfolio), so switching cannot apply. */
	pinned?: boolean;
	children: ReactNode;
}) {
	useEffect(() => {
		if (remember) rememberLocale(locale);
	}, [locale, remember]);
	return (
		<LocaleContext.Provider value={locale}>
			<LocalePinnedContext.Provider value={pinned}>{children}</LocalePinnedContext.Provider>
		</LocaleContext.Provider>
	);
}

/** True when the page language comes from published content rather than the visitor's choice. */
export const useLocalePinned = () => useContext(LocalePinnedContext);

/**
 * Returns the interface language of the current route and a switcher. The language is part
 * of the path, so it is known during server rendering and never needs client-side restoration.
 * Switching keeps the current page, query and hash under the other language prefix. Pages
 * without a prefix (portfolio and unmatched URLs) re-render in place from the saved choice.
 */
export function useInterfaceLocale() {
	const locale = useContext(LocaleContext);
	const router = useRouter();
	const changeLocale = useCallback(
		(value: Locale) => {
			const { locale: routeLocale, path } = splitLocalePath(window.location.pathname);
			if (!routeLocale) {
				rememberLocale(value);
				router.refresh();
				return;
			}
			router.replace(`${localeHref(value, path)}${window.location.search}${window.location.hash}`, {
				scroll: false,
			});
		},
		[router],
	);
	return [locale, changeLocale] as const;
}

/** Returns the current app path without its language prefix ("/ar/admin" → "/admin"). */
export function useRoutePath() {
	return splitLocalePath(usePathname()).path;
}
