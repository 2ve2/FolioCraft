import type { Locale } from "@ichnara/contracts";

/** Formats a server timestamp using the selected interface locale. */
export function date(value: string, locale: Locale) {
	return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
		calendar: "gregory",
		dateStyle: "medium",
		timeStyle: "short",
	});
}
