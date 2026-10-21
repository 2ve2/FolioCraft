import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ButtonContent } from "../src/components/ui/button-content";
import { AuthRecoveryLinks } from "../src/features/auth/auth-recovery-links";
import { LoadingScreen } from "../src/features/studio/loading-screen";
import { WorkspaceHeader } from "../src/features/studio/workspace-header";

/** The route already carries the language, so loading states render localized text at once. */
test("loading screen renders its localized status immediately in both languages", () => {
	const ar = renderToStaticMarkup(<LoadingScreen locale="ar" message="جارٍ التحقق…" />);
	expect(ar).toContain('dir="rtl"');
	expect(ar).toContain("جارٍ فتح صفحتك");
	expect(ar).toContain("جارٍ التحقق…");
	expect(ar).not.toContain("aria-busy");
	const en = renderToStaticMarkup(<LoadingScreen locale="en" message="Checking your session…" />);
	expect(en).toContain("Opening your page");
	expect(en).toContain("Checking your session…");
});

/** Recovery links follow their actual account state and keep the selected interface language. */
test("signup omits recovery shortcuts and verification resend appears only when required", () => {
	for (const locale of ["ar", "en"] as const) {
		for (const mode of ["login", "signup"] as const) {
			for (const verificationRequired of [false, true]) {
				const markup = renderToStaticMarkup(
					<AuthRecoveryLinks
						locale={locale}
						mode={mode}
						verificationRequired={verificationRequired}
					/>,
				);
				expect(markup.includes(`/${locale}/forgot-password`)).toBe(mode === "login");
				expect(markup.includes(`/${locale}/verify-email`)).toBe(verificationRequired);
			}
		}
	}
});

/** The original name stays accessible and reserves width while the spinner is decorative. */
test("pending actions preserve their label and use one centered decorative spinner", () => {
	for (const loading of [false, true]) {
		const markup = renderToStaticMarkup(
			<ButtonContent loading={loading}>Submit action</ButtonContent>,
		);
		expect(markup).toContain("Submit action");
		expect(markup.includes('aria-busy="true"')).toBe(loading);
		expect(markup.includes('aria-hidden="true"')).toBe(loading);
		expect((markup.match(/<svg/g) ?? []).length).toBe(loading ? 1 : 0);
	}
});

test("publication uses the shared pending content without substituting a working label", () => {
	for (const locale of ["ar", "en"] as const) {
		const markup = renderToStaticMarkup(
			<WorkspaceHeader
				locale={locale}
				localeControl={null}
				section="content"
				saveState="saved"
				busy
				publish={async () => {}}
			/>,
		);
		expect(markup).toContain('aria-busy="true"');
		expect(markup).toContain('disabled=""');
		expect(markup).not.toContain(locale === "ar" ? "جارٍ التنفيذ" : "Working");
	}
});
