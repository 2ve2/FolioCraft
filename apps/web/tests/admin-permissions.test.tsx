import { expect, test } from "bun:test";
import { canViewAdmin, isStaff, permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import { adminCopy } from "../src/features/management/admin/admin-copy";
import { adminSecurityCopy } from "../src/features/management/admin/admin-security-copy";
import { SiteModerationDialog } from "../src/features/management/admin/site-moderation-dialog";

test("console navigation follows server permission grants and both locales share copy keys", () => {
	expect(canViewAdmin(permissionsFor("support"), "audit")).toBe(false);
	expect(canViewAdmin(permissionsFor("analyst"), "audit")).toBe(true);
	expect(canViewAdmin(permissionsFor("admin"), "overview")).toBe(false);
	expect(isStaff("admin")).toBe(false);
	expect(isStaff("support,moderator")).toBe(true);
	expect(Object.keys(adminCopy.ar).sort()).toEqual(Object.keys(adminCopy.en).sort());
});

test("read-only roles cannot render moderation actions", () => {
	const details = {
		id: "site",
		slug: "fixture",
		ownerId: "member",
		revision: 0,
		publishedReleaseId: null,
		suspended: false,
		suspensionReason: null,
	};
	for (const role of ["owner", "moderator", "support", "analyst"] as const) {
		const controller = {
			details,
			reason: "",
			busy: false,
			error: "",
			closeSiteDetails: () => {},
		} as unknown as Parameters<typeof SiteModerationDialog>[0]["controller"];
		const html = renderToStaticMarkup(
			<AdminContext.Provider
				value={{
					locale: "en",
					setLocale: () => {},
					user: { id: "fixture", name: "Fixture", email: "f***@example.com" },
					permissions: permissionsFor(role),
				}}
			>
				<SiteModerationDialog controller={controller} locale="en" />
			</AdminContext.Provider>,
		);
		expect(html.includes("textarea")).toBe(role === "owner" || role === "moderator");
		expect(html.includes('type="password"')).toBe(role === "owner" || role === "moderator");
		expect(html).not.toContain('role="combobox"');
	}
});

test("MFA enrollment and challenge copy is complete in both interface locales", () => {
	expect(Object.keys(adminSecurityCopy.ar).sort()).toEqual(
		Object.keys(adminSecurityCopy.en).sort(),
	);
	for (const locale of ["ar", "en"] as const)
		for (const value of Object.values(adminSecurityCopy[locale]))
			expect(value.trim().length).toBeGreaterThan(0);
	expect(adminSecurityCopy.ar.title).not.toBe(adminSecurityCopy.en.title);
});

test("site moderation asks for the operator password in both locales and disables incomplete submissions", () => {
	for (const locale of ["en", "ar"] as const) {
		const controller = {
			details: { id: "site", slug: "fixture", ownerId: "member", suspended: false },
			reason: "Reviewed site",
			password: "",
			busy: false,
			error: "",
			closeSiteDetails: () => {},
		} as unknown as Parameters<typeof SiteModerationDialog>[0]["controller"];
		const html = renderToStaticMarkup(
			<AdminContext.Provider
				value={{
					locale,
					setLocale: () => {},
					user: { id: "actor", name: "Actor", email: "a***@example.com" },
					permissions: permissionsFor("moderator"),
				}}
			>
				<SiteModerationDialog controller={controller} locale={locale} />
			</AdminContext.Provider>,
		);
		expect(html).toContain(adminCopy[locale].operatorPassword);
		expect(html).toContain('type="password"');
		expect(html).toContain('autoComplete="current-password"');
		expect(html).toContain('maxLength="1024"');
		expect(html).toContain('disabled=""');
		expect(html).toContain('minLength="10"');
	}
});

test("every permission, recorded action and target type has an Arabic and English name", async () => {
	const { adminStatements } = await import("@ichnara/contracts/admin-policy");
	const { actionLabels, recordedActions, targetLabels } = await import(
		"../src/features/management/admin/admin-copy"
	);
	const permissions = Object.entries(adminStatements).flatMap(([resource, actions]) =>
		actions.map((action) => `${resource}.${action}`),
	);
	for (const key of [...permissions, ...recordedActions]) {
		expect(actionLabels[key]?.en, key).toBeTruthy();
		expect(actionLabels[key]?.ar, key).toMatch(/[؀-ۿ]/);
	}
	for (const target of ["user", "site", "session", "report", "notice", "audit", "request"])
		expect(targetLabels[target]?.ar, target).toMatch(/[؀-ۿ]/);
});
