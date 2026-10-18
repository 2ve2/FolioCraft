import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Brand } from "../src/components/ui/brand";
import { brandArtwork } from "../src/components/ui/brand-artwork";

/** Proves that locale rendering retains the exact delivered path/transform geometry without native tooltips. */
test("accepted bilingual Brand matches delivered masters and retains inherited color/accessibility", () => {
	for (const locale of ["en", "ar"] as const) {
		const markup = renderToStaticMarkup(<Brand locale={locale} />);
		const file = resolve(
			import.meta.dir,
			`../public/brand/ichnara/ichnara-logo-${locale === "ar" ? "ar-" : ""}ink.svg`,
		);
		const master = readFileSync(file, "utf8");
		expect(markup).toContain(`viewBox="${brandArtwork[locale].viewBox}"`);
		expect(markup).toContain('fill="currentColor"');
		expect(markup).toContain(
			locale === "ar" ? 'aria-label="إيكنارا — Ichnara"' : 'aria-label="Ichnara"',
		);
		expect(markup).not.toMatch(/<title|title=/);
		for (const group of brandArtwork[locale].groups) {
			expect(master).toContain(`transform="${group.transform}"`);
			for (const path of group.paths) expect(master).toContain(`d="${path.d}"`);
		}
	}
});
