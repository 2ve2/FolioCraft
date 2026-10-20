import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ButtonContent } from "../src/components/ui/button-content";
import { AuthRecoveryLinks } from "../src/features/auth/auth-recovery-links";
import { LoadingScreen } from "../src/features/studio/loading-screen";
import { WorkspaceHeader } from "../src/features/studio/workspace-header";

/** Initial static HTML must not flash the default language before the URL locale is restored. */
test("unresolved interface locale renders neutral artwork without translated text or an English wordmark", () => {
	const markup = renderToStaticMarkup(
		<LoadingScreen locale="en" localeReady={false} message="Checking your session…" />,
	);
	expect(markup).toContain("loading-sheet--front");
	expect(markup).toContain('aria-busy="true"');
	expect(markup).not.toContain("Opening your page");
	expect(markup).not.toContain("Checking your session");
	expect(markup).not.toContain("Ichnara");
	expect(markup).not.toContain("loading-signature");
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
				expect(markup.includes(`/forgot-password?lang=${locale}`)).toBe(mode === "login");
				expect(markup.includes(`/verify-email?lang=${locale}`)).toBe(verificationRequired);
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
