import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { formatDraftIssues } from "../src/features/studio/draft-errors";
import { LandingShowcase } from "../src/features/studio/landing-showcase";
import { withHttps } from "../src/lib/web-address";

test("a field failing several rules is named once, with each language's separator", () => {
	const issues = [
		{ path: ["profile", "website"] },
		{ path: ["profile", "website"] },
		{ path: ["profile", "socialLinks", 0, "url"] },
	];
	expect(formatDraftIssues(issues, false)).toBe(
		"Profile / Website; Profile / Social links / 1 / Link",
	);
	expect(formatDraftIssues(issues, true)).toBe(
		"النبذة / الموقع؛ النبذة / روابط التواصل / 1 / الرابط",
	);
});

test("addresses typed without a scheme get https://, everything else stays as typed", () => {
	expect(withHttps("github.com/user")).toBe("https://github.com/user");
	expect(withHttps(" www.example.com ")).toBe("https://www.example.com");
	expect(withHttps("//example.org/a")).toBe("https://example.org/a");
	for (const kept of [
		"",
		"https://example.com",
		"http://a.io",
		"mailto:a@b.co",
		"notaurl",
		"two words.com",
	])
		expect(withHttps(kept)).toBe(kept);
});

test("the landing example keeps its links on the landing page instead of a missing /p/ address", () => {
	for (const locale of ["ar", "en"] as const) {
		const html = renderToStaticMarkup(
			<LandingShowcase locale={locale} expanded={false} device="desktop" onClose={() => {}} />,
		);
		expect(html).not.toContain("/p/illustrative-example");
		expect(html).toContain('href="#example/projects/');
	}
});
