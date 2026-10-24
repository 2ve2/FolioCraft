import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthRecoveryLinks } from "../src/features/auth/auth-recovery-links";
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

test("the check-your-email step names the address it was sent to", () => {
	for (const locale of ["ar", "en"] as const) {
		const html = renderToStaticMarkup(
			<SignupSent locale={locale} email="sara@example.com" onBack={() => {}} />,
		);
		expect(html).toContain("sara@example.com");
		expect(html).toContain(locale === "ar" ? "تحقّق من بريدك" : "Check your email");
		expect(html).toContain(
			locale === "ar" ? "أرسلنا رابط تفعيل الحساب إلى" : "We sent an activation link to",
		);
		// A registered address is refused on the form, so this step no longer hedges about one.
		expect(html).not.toContain(locale === "ar" ? "إذا كان" : "If ");
		expect(html).toContain(`href="/${locale}/login"`);
		// The resend button starts in its cool-down so the first message has time to arrive.
		expect(html).toMatch(
			/<button[^>]*disabled=""[^>]*class="secondary"|class="secondary"[^>]*disabled=""/,
		);
	}
});

test("a refused sign-up for a registered address offers password recovery", () => {
	for (const locale of ["ar", "en"] as const) {
		const refused = renderToStaticMarkup(
			<AuthRecoveryLinks locale={locale} mode="signup" verificationRequired={false} emailTaken />,
		);
		expect(refused).toContain(`href="/${locale}/forgot-password"`);
		const plain = renderToStaticMarkup(
			<AuthRecoveryLinks locale={locale} mode="signup" verificationRequired={false} />,
		);
		expect(plain).not.toContain("forgot-password");
	}
});
