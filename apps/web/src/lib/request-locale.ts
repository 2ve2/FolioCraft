import type { Locale } from "@ichnara/contracts";
import { cookies, headers } from "next/headers";
import { isLocale, localeCookie, negotiateLocale } from "./locale";

/**
 * Resolves the interface language for server components outside the `[locale]` routes
 * (404 pages): the remembered preference first, then the browser's Accept-Language.
 */
export async function requestLocale(): Promise<Locale> {
	const remembered = (await cookies()).get(localeCookie)?.value;
	if (isLocale(remembered)) return remembered;
	return negotiateLocale((await headers()).get("accept-language"));
}
