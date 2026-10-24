import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SignupFields } from "../src/features/auth/signup-fields";
import { SignupSent } from "../src/features/auth/signup-sent";

test("sign-up fields start with guidance, keep native rules and offer a password toggle", () => {
	for (const locale of ["ar", "en"] as const) {
		const html = renderToStaticMarkup(<SignupFields locale={locale} firstInput={null} />);
		expect(html).toContain('minLength="10"');
		expect(html).toContain('autoComplete="new-password"');
		expect(html).toContain(locale === "ar" ? "١٠ أحرف على الأقل" : "At least 10 characters");
		expect(html).toContain(locale === "ar" ? "إظهار كلمة المرور" : "Show password");
		expect(html).not.toContain('data-state="invalid"');
	}
});

test("the check-your-email step names the address and covers an existing account", () => {
	for (const locale of ["ar", "en"] as const) {
		const html = renderToStaticMarkup(
			<SignupSent locale={locale} email="sara@example.com" onBack={() => {}} />,
		);
		expect(html).toContain("sara@example.com");
		expect(html).toContain(locale === "ar" ? "تحقّق من بريدك" : "Check your email");
		expect(html).toContain(
			locale === "ar" ? "إذا كان لديك حساب بهذا البريد" : "already have an account",
		);
		expect(html).toContain(`href="/${locale}/login"`);
		// The resend button starts in its cool-down so the first message has time to arrive.
		expect(html).toMatch(
			/<button[^>]*disabled=""[^>]*class="secondary"|class="secondary"[^>]*disabled=""/,
		);
	}
});
