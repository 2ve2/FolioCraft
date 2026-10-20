import { expect, test } from "bun:test";
import { localeHref, negotiateLocale, splitLocalePath } from "../src/lib/locale";
import { localeRedirects, localizedPages } from "../src/lib/locale-redirects";

test("locale helpers build and split prefixed app paths", () => {
	expect(localeHref("ar", "/")).toBe("/ar");
	expect(localeHref("en", "/login")).toBe("/en/login");
	expect(localeHref("ar", "/admin/mfa-required?challenge=1")).toBe(
		"/ar/admin/mfa-required?challenge=1",
	);
	expect(localeHref("en", "/?x=1")).toBe("/en?x=1");
	expect(splitLocalePath("/ar/admin/sites")).toEqual({ locale: "ar", path: "/admin/sites" });
	expect(splitLocalePath("/en")).toEqual({ locale: "en", path: "/" });
	expect(splitLocalePath("/login")).toEqual({ locale: null, path: "/login" });
	expect(splitLocalePath("/arabic")).toEqual({ locale: null, path: "/arabic" });
});

test("Accept-Language negotiation honours quality order and falls back to English", () => {
	expect(negotiateLocale("ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
	expect(negotiateLocale("fr-FR,en;q=0.5,ar;q=0.9")).toBe("ar");
	expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
	expect(negotiateLocale("fr-FR,de;q=0.8")).toBe("en");
	expect(negotiateLocale("ar;q=0")).toBe("en");
	expect(negotiateLocale(null)).toBe("en");
});

test("redirect rules check legacy ?lang, then the cookie, then an Arabic-first browser, then English", () => {
	const rules = localeRedirects();
	for (const source of ["/", `/:page(${localizedPages.join("|")})/:rest*`]) {
		const group = rules.filter((rule) => rule.source === source);
		expect(group.map((rule) => rule.has?.[0]?.type ?? "fallback")).toEqual([
			"query",
			"cookie",
			"header",
			"fallback",
		]);
		expect(group.every((rule) => rule.permanent === false)).toBe(true);
		expect(group[3].destination.startsWith("/en")).toBe(true);
	}
	// Next.js anchors `has` values as full matches.
	const header = rules.find((rule) => rule.has?.[0]?.type === "header")?.has?.[0]?.value ?? "";
	const arabicFirst = new RegExp(`^${header}$`);
	for (const value of ["ar", "ar-SA,ar;q=0.9,en;q=0.8", "ar;q=0.9"])
		expect(arabicFirst.test(value)).toBe(true);
	for (const value of ["en-US,en;q=0.9,ar;q=0.8", "arn", "fr,ar"])
		expect(arabicFirst.test(value)).toBe(false);
	const language = new RegExp(`^${rules[0].has?.[0]?.value}$`);
	expect(language.test("ar") && language.test("en") && !language.test("fr")).toBe(true);
});
