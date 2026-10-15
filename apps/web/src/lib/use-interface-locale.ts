"use client";
import type { Locale } from "@folio/contracts";
import { useEffect, useState } from "react";

/** Carries interface language in the URL without modifying the portfolio content language. */
export function useInterfaceLocale() {
	const [locale, setLocale] = useState<Locale>("en");
	const [ready, setReady] = useState(false);

	useEffect(() => {
		/** Restores the language when entering a route or navigating browser history. */
		function readLocale() {
			setLocale(new URLSearchParams(window.location.search).get("lang") === "ar" ? "ar" : "en");
		}
		readLocale();
		setReady(true);
		window.addEventListener("popstate", readLocale);
		return () => window.removeEventListener("popstate", readLocale);
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
		document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
	}, [locale]);

	/** Updates only the current route's interface-language parameter and document direction. */
	function changeLocale(value: Locale) {
		setLocale(value);
		const url = new URL(window.location.href);
		url.searchParams.set("lang", value);
		window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
	}

	return [locale, changeLocale, ready] as const;
}
