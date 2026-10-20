import { expect, test } from "bun:test";
import { authMailContent, mailLocale } from "../src/lib/auth/mail-templates";

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

test("Arabic and English mails are single-language, directional and escape the account name", () => {
	const ar = authMailContent("reset", "ar", "<b>سارة</b>", link("ar"));
	expect(ar.subject).toBe("إعادة تعيين كلمة المرور — إيكنارا");
	expect(ar.html).toContain('<html lang="ar" dir="rtl">');
	expect(ar.html).toContain("&lt;b&gt;سارة&lt;/b&gt;");
	expect(ar.html).not.toContain("<b>سارة</b>");
	expect(ar.html).not.toContain("Reset password");
	expect(ar.text).toContain(link("ar"));

	const en = authMailContent("verify", "en", "Sam", link("en"));
	expect(en.subject).toBe("Verify your email — Ichnara");
	expect(en.html).toContain('<html lang="en" dir="ltr">');
	expect(en.html).not.toContain("تأكيد");
	expect(en.html).toContain(`href="${link("en").replaceAll("&", "&amp;")}"`);
});
