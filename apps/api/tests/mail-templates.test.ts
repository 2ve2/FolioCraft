import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	AUTH_LINK_MINUTES,
	authMailContent,
	EMAIL_LOGOS,
	mailLocale,
} from "../src/lib/auth/mail-templates";

const link = (lang?: string) =>
	`https://api.example.test/api/auth/reset-password/token?callbackURL=${encodeURIComponent(
		`https://example.test/reset-password${lang ? `?lang=${lang}` : ""}`,
	)}`;

test("mail language follows the web callback and falls back to English", () => {
	expect(mailLocale(link("ar"))).toBe("ar");
	expect(mailLocale(link("en"))).toBe("en");
	expect(mailLocale(link())).toBe("en");
	expect(mailLocale(link("fr"))).toBe("en");
	expect(mailLocale("not a url")).toBe("en");
});

test("mail language follows the callback path prefix used by localized web routes", () => {
	const prefixed = (path: string) =>
		`https://api.example.test/api/auth/verify-email?token=t&callbackURL=${encodeURIComponent(
			`https://example.test${path}`,
		)}`;
	expect(mailLocale(prefixed("/ar/verify-email?verified=1"))).toBe("ar");
	expect(mailLocale(prefixed("/en/reset-password"))).toBe("en");
	expect(mailLocale(prefixed("/arabic/reset-password"))).toBe("en");
});

test("Arabic and English mails are single-language, directional and escape the account name", () => {
	const ar = authMailContent("reset", "ar", "<b>سارة</b>", link("ar"), "https://web.example.test");
	expect(ar.subject).toBe("إعادة تعيين كلمة المرور — إيكنارا");
	expect(ar.html).toContain('<html lang="ar" dir="rtl">');
	expect(ar.html).toContain("&lt;b&gt;سارة&lt;/b&gt;");
	expect(ar.html).not.toContain("<b>سارة</b>");
	expect(ar.html).not.toContain("Reset password");
	expect(ar.text).toContain(link("ar"));

	const en = authMailContent("verify", "en", "Sam", link("en"), "https://web.example.test");
	expect(en.subject).toBe("Verify your email — Ichnara");
	expect(en.html).toContain('<html lang="en" dir="ltr">');
	expect(en.html).not.toContain("تأكيد");
	expect(en.html).toContain(`href="${link("en").replaceAll("&", "&amp;")}"`);
});

test("mails show the hosted brand logo with alt text and the real link lifetime", () => {
	const ar = authMailContent("verify", "ar", "سارة", link("ar"), "https://web.example.test");
	expect(ar.html).toContain('src="https://web.example.test/brand/ichnara/ichnara-email-ar.png"');
	expect(ar.html).toContain('alt="إيكنارا"');
	expect(ar.html).toContain("الرابط صالح لمدة ساعة واحدة");
	const en = authMailContent("reset", "en", "Sam", link("en"), "https://web.example.test/");
	expect(en.html).toContain('src="https://web.example.test/brand/ichnara/ichnara-email-en.png"');
	expect(en.html).toContain('alt="Ichnara"');
	expect(en.text).toContain("expires in one hour");
	expect(AUTH_LINK_MINUTES).toBe(60);
});

test("email logo files exist at twice their declared display size", () => {
	for (const logo of Object.values(EMAIL_LOGOS)) {
		const png = readFileSync(resolve(import.meta.dir, "../../web/public/brand/ichnara", logo.file));
		// PNG IHDR: width and height are big-endian 32-bit integers at bytes 16 and 20.
		expect(Math.round(png.readUInt32BE(16) / 2)).toBe(logo.width);
		expect(Math.round(png.readUInt32BE(20) / 2)).toBe(logo.height);
	}
});
