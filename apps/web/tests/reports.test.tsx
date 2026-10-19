import { expect, test } from "bun:test";
import { emptyDraft, reportCategories, reportInput, reportStatusInput } from "@ichnara/contracts";
import { canViewAdmin, permissionsFor } from "@ichnara/contracts/admin-policy";
import { Portfolio, PortfolioDetail } from "@ichnara/portfolio";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import { adminCopy } from "../src/features/management/admin/admin-copy";
import { AdminReports } from "../src/features/management/admin/admin-reports";
import { reportCopy } from "../src/features/portfolio/report-copy";
import { ReportForm } from "../src/features/portfolio/report-form";

test("report copy has real Arabic/English parity and category/status coverage", () => {
	expect(Object.keys(reportCopy.ar).sort()).toEqual(Object.keys(reportCopy.en).sort());
	expect(Object.keys(adminCopy.ar.report).sort()).toEqual(Object.keys(adminCopy.en.report).sort());
	for (const locale of ["ar", "en"] as const) {
		for (const value of [
			...Object.values(reportCopy[locale]),
			...Object.values(adminCopy[locale].report),
		])
			expect(value.trim().length).toBeGreaterThan(0);
		for (const category of reportCategories) expect(reportCopy[locale][category]).not.toBe("");
	}
	expect(reportCopy.ar.title).not.toBe(reportCopy.en.title);
});
test("published main/detail share the report action while previews retain their existing content", () => {
	for (const locale of ["ar", "en"] as const) {
		const draft = emptyDraft(locale);
		draft.profile.name = "Report preview";
		const before = JSON.stringify(draft),
			action = <ReportForm slug="fixture" locale={locale} />;
		const html = renderToStaticMarkup(<Portfolio draft={draft} reportAction={action} />);
		expect(html).toContain(reportCopy[locale].title);
		expect(html).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
		const detail = renderToStaticMarkup(
			<PortfolioDetail
				draft={draft}
				article={{
					id: "fixture",
					slug: "fixture",
					title: "Article",
					summary: "",
					body: "Body",
					published: true,
				}}
				reportAction={action}
			/>,
		);
		expect(detail).toContain(reportCopy[locale].title);
		expect(renderToStaticMarkup(<Portfolio draft={draft} />)).not.toContain(
			reportCopy[locale].title,
		);
		expect(JSON.stringify(draft)).toBe(before);
	}
});
test("report queue renders bilingual filters and only granted roles can navigate", () => {
	for (const locale of ["ar", "en"] as const) {
		for (const role of ["owner", "moderator", "support", "analyst"]) {
			expect(canViewAdmin(permissionsFor(role), "reports")).toBe(true);
			const html = renderToStaticMarkup(
				<AdminContext.Provider
					value={{
						locale,
						setLocale: () => {},
						user: { id: "fixture", name: "Fixture", email: "f***@example.com" },
						permissions: permissionsFor(role),
					}}
				>
					<AdminReports />
				</AdminContext.Provider>,
			);
			expect(html).toContain(adminCopy[locale].report.title);
			expect(html).toContain('aria-haspopup="listbox"');
			expect(html).toContain(adminCopy[locale].report.loading);
		}
		expect(canViewAdmin(permissionsFor("user"), "reports")).toBe(false);
	}
	expect(
		reportInput.safeParse({
			category: "spam",
			message: "Required report details",
			reporterIp: "127.0.0.1",
		}).success,
	).toBe(false);
	expect(reportStatusInput.safeParse({ status: "dismissed" }).success).toBe(false);
	expect(
		reportStatusInput.safeParse({ status: "actioned", resolutionNote: "Reviewed and resolved" })
			.success,
	).toBe(true);
});
