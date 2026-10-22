import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioSkeleton } from "../src/features/studio/studio-skeleton";

for (const locale of ["ar", "en"] as const) {
	test(`studio startup has one localized live status and neutral data areas (${locale})`, () => {
		const html = renderToStaticMarkup(
			<StudioSkeleton
				locale={locale}
				localeControl={<button type="button">{locale === "ar" ? "العربية" : "English"}</button>}
			/>,
		);
		expect(html).toContain('aria-busy="true"');
		expect(html).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
		expect(html.match(/role="status"/g)).toHaveLength(1);
		expect(html).toContain(
			locale === "ar" ? "جارٍ تحميل الاستوديو الخاص بك" : "Loading your studio",
		);
		const placeholders = html.match(/<div[^>]*studio-placeholder[^>]*>.*?<\/div>/g) ?? [];
		expect(placeholders.length).toBeGreaterThan(5);
		for (const block of placeholders) expect(block.replace(/<[^>]*>/g, "")).toBe("");
		expect(html).toContain('aria-hidden="true" class="studio-skeleton-editor"');
		expect(html).not.toContain('role="alert"');
		expect(html).not.toContain("loading-screen");
		expect(html).not.toContain("input");
		expect(html).not.toContain("img src=");
		expect(html).toContain('class="nav-item active" disabled=""');
	});
}
