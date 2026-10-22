import type { NextConfig } from "next";
import { defaultLocale, localeCookie } from "./locale";
import { signedInCookie } from "./signed-in-hint";

/** Platform pages that live under a language prefix (`/ar/...`, `/en/...`). */
export const localizedPages = [
	"login",
	"signup",
	"forgot-password",
	"reset-password",
	"verify-email",
	"studio",
	"admin",
	"privacy",
	"terms",
	"content-policy",
] as const;

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

const languageValue = "(?<locale>ar|en)";

type Condition = NonNullable<Redirect["has"]>[number];

/**
 * Routes un-prefixed platform URLs to their language prefix with static redirect rules, which
 * Next.js and OpenNext evaluate in their router (no proxy runtime). For each URL the first
 * matching rule wins: legacy `?lang=` (old links and emails), the remembered preference
 * cookie, an Arabic-first browser, then the default language. The original query string is
 * kept, so tokens in old reset/verification links survive. A browser holding the signed-in hint
 * opens the studio from the bare address, as signed-in workspaces usually do; `/ar` and `/en`
 * still show the product page, and the studio itself verifies the session.
 */
export function localeRedirects(): Redirect[] {
	const signedIn: Condition = { type: "cookie", key: signedInCookie, value: "1" };
	return [
		...languageRules("/", (locale) => `/${locale}/studio`, [signedIn]),
		...languageRules("/", (locale) => `/${locale}`),
		...languageRules(
			`/:page(${localizedPages.join("|")})/:rest*`,
			(locale) => `/${locale}/:page/:rest*`,
		),
	];
}

/** Builds the four language rules for one source, each also requiring the given conditions. */
function languageRules(
	source: string,
	destination: (locale: string) => string,
	required: Condition[] = [],
): Redirect[] {
	const rule = (locale: string, condition?: Condition): Redirect => {
		const has = condition ? [...required, condition] : required;
		return {
			source,
			...(has.length ? { has } : {}),
			destination: destination(locale),
			permanent: false,
		};
	};
	return [
		rule(":locale", { type: "query", key: "lang", value: languageValue }),
		rule(":locale", { type: "cookie", key: localeCookie, value: languageValue }),
		// Browsers list the preferred language first, e.g. "ar-SA,ar;q=0.9,en;q=0.8".
		rule("ar", { type: "header", key: "accept-language", value: "\\s*ar(?:[-_;,].*)?" }),
		rule(defaultLocale),
	];
}
