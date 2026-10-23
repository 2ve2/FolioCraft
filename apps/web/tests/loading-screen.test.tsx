import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LoadingScreen } from "../src/features/studio/loading-screen";

/** Loading status remains announced instead of being trapped inside an indefinitely busy region. */
test("shared loading shell presents contextual status in both languages without fabricated progress", () => {
	for (const locale of ["ar", "en"] as const) {
		const message = locale === "ar" ? "جارٍ التحقق من الجلسة…" : "Checking your session…";
		const markup = renderToStaticMarkup(<LoadingScreen locale={locale} message={message} />);
		expect(markup).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
		expect(markup).toContain(message);
		expect(markup).toContain('role="status"');
		expect(markup).toContain('aria-atomic="true"');
		expect(markup).not.toContain('aria-busy="true"');
		expect(markup).not.toContain("aria-valuenow");
		expect(markup).not.toContain("loading-track");
		expect(markup).toContain("loading-signature");
		expect(markup).toContain("loading-sheet--front");
		expect(markup).not.toContain("select-trigger");
	}
});

/** Errors keep the real caller's actions and stop the decorative pending animation. */
test("error state announces failure and preserves caller-supplied recovery controls", () => {
	const markup = renderToStaticMarkup(
		<LoadingScreen locale="en" message="Connection unavailable" error>
			<button type="button">Retry connection</button>
			<a href="/?lang=en">Home</a>
		</LoadingScreen>,
	);
	expect(markup).toContain('role="alert"');
	expect(markup).toContain("Connection unavailable");
	expect(markup).toContain("Retry connection");
	expect(markup).toContain('href="/?lang=en"');
	expect(markup).not.toContain("loading-spinner");
	expect(markup).not.toContain("loading-help");
	expect(markup).toContain('data-state="error"');
});

/** The signature draws each language's word, not the emblem, inside the word's own bounds. */
test("loading signature shows the localized wordmark", async () => {
	const { brandArtwork } = await import("../src/components/ui/brand-artwork");
	for (const locale of ["ar", "en"] as const) {
		const markup = renderToStaticMarkup(<LoadingScreen locale={locale} message="…" />);
		const signature = markup.slice(markup.indexOf('class="loading-signature"'));
		const word = brandArtwork[locale].groups.find((group) => group.role === "word");
		expect(word).toBeDefined();
		for (const path of word?.paths ?? []) expect(signature).toContain(path.d);
		expect(signature).not.toContain("transform=");
	}
});
