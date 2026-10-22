import { expect, test } from "bun:test";
import { canViewAdmin, isStaff, permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import { adminCopy } from "../src/features/management/admin/admin-copy";
import { AdminManagementDialogs } from "../src/features/management/admin/admin-management-dialogs";
import { adminSecurityCopy } from "../src/features/management/admin/admin-security-copy";

test("console navigation follows server permission grants and both locales share copy keys", () => {
	expect(canViewAdmin(permissionsFor("support"), "audit")).toBe(false);
	expect(canViewAdmin(permissionsFor("analyst"), "audit")).toBe(true);
	expect(canViewAdmin(permissionsFor("admin"), "overview")).toBe(false);
	expect(isStaff("admin")).toBe(false);
	expect(isStaff("support,moderator")).toBe(true);
	expect(Object.keys(adminCopy.ar).sort()).toEqual(Object.keys(adminCopy.en).sort());
});

test("read-only roles cannot render moderation actions and sensitive account controls remain unavailable", () => {
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
			selected: { id: "member", name: "Member", email: "m***@example.com" },
			closeSiteDetails: () => {},
			closeUser: () => {},
		} as unknown as Parameters<typeof AdminManagementDialogs>[0]["controller"];
		const html = renderToStaticMarkup(
			<AdminContext.Provider
				value={{
					locale: "en",
					setLocale: () => {},
					user: { id: "fixture", name: "Fixture", email: "f***@example.com" },
					permissions: permissionsFor(role),
				}}
			>
				<AdminManagementDialogs controller={controller} locale="en" currentUserId="fixture" />
			</AdminContext.Provider>,
		);
		expect(html.includes("textarea")).toBe(role === "owner" || role === "moderator");
		expect(html).toContain(adminCopy.en.securityPending);
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
			selected: null,
			closeSiteDetails: () => {},
		} as unknown as Parameters<typeof AdminManagementDialogs>[0]["controller"];
		const html = renderToStaticMarkup(
			<AdminContext.Provider
				value={{
					locale,
					setLocale: () => {},
					user: { id: "actor", name: "Actor", email: "a***@example.com" },
					permissions: permissionsFor("moderator"),
				}}
			>
				<AdminManagementDialogs controller={controller} locale={locale} currentUserId="actor" />
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
