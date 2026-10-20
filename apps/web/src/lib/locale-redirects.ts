import type { NextConfig } from "next";
import { defaultLocale, localeCookie } from "./locale";

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

/**
 * Routes un-prefixed platform URLs to their language prefix with static redirect rules, which
 * Next.js and OpenNext evaluate in their router (no proxy runtime). For each URL the first
 * matching rule wins: legacy `?lang=` (old links and emails), the remembered preference
 * cookie, an Arabic-first browser, then the default language. The original query string is
 * kept, so tokens in old reset/verification links survive.
 */
export function localeRedirects(): Redirect[] {
	const targets = [
		{ source: "/", destination: (locale: string) => `/${locale}` },
		{
			source: `/:page(${localizedPages.join("|")})/:rest*`,
			destination: (locale: string) => `/${locale}/:page/:rest*`,
		},
	];
	return targets.flatMap(({ source, destination }) => [
		{
			source,
			has: [{ type: "query" as const, key: "lang", value: languageValue }],
			destination: destination(":locale"),
			permanent: false,
		},
		{
			source,
			has: [{ type: "cookie" as const, key: localeCookie, value: languageValue }],
			destination: destination(":locale"),
			permanent: false,
		},
		{
			source,
			// Browsers list the preferred language first, e.g. "ar-SA,ar;q=0.9,en;q=0.8".
			has: [{ type: "header" as const, key: "accept-language", value: "\\s*ar(?:[-_;,].*)?" }],
			destination: destination("ar"),
			permanent: false,
		},
		{ source, destination: destination(defaultLocale), permanent: false },
	]);
}
