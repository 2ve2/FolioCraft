import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Input } from "../src/features/content/input";

// ISO values must survive locale changes without timezone parsing or reversal.
test("native date fields declare locale direction and retain empty/leap-day values", () => {
	for (const locale of ["ar", "en"] as const) {
		for (const value of ["", "2024-02-29", "2026-10-18"]) {
			const html = renderToStaticMarkup(
				<Input label="Start date" type="date" locale={locale} value={value} onChange={() => {}} />,
			);
			expect(html).toContain(`lang="${locale}"`);
			expect(html).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
			expect(html).toContain('type="date"');
			expect(html).toContain(`value="${value}"`);
			expect(html).toContain("content-date");
			expect(html).not.toContain("readonly");
		}
	}
});
