import { expect, test } from "bun:test";
import { dataRequestInput, dataRequestTransitions } from "@ichnara/contracts";
import { canViewAdmin, permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import { AdminQueryProvider } from "../src/features/management/admin/admin-query";
import { AdminRequests } from "../src/features/management/admin/admin-requests";
import { adminSecurityCopy } from "../src/features/management/admin/admin-security-copy";
import { AdminStaff } from "../src/features/management/admin/admin-staff";
import { requestsCopy } from "../src/features/management/admin/requests-copy";

test("P6 exact bilingual copy parity and permission-driven controls", () => {
	for (const copy of [requestsCopy, adminSecurityCopy])
		expect(Object.keys(copy.ar).sort()).toEqual(Object.keys(copy.en).sort());
	for (const locale of ["ar", "en"] as const)
		for (const role of ["owner", "support", "moderator", "analyst"]) {
			const permissions = permissionsFor(role);
			expect(canViewAdmin(permissions, "requests")).toBe(["owner", "support"].includes(role));
			expect(canViewAdmin(permissions, "staff")).toBe(role === "owner");
			const wrap = (node: React.ReactNode) =>
				renderToStaticMarkup(
					<AdminQueryProvider>
						<AdminContext.Provider
							value={{
								locale,
								permissions,
								setLocale: () => {},
								user: { id: "fixture", name: "Fixture", email: "masked" },
							}}
						>
							{node}
						</AdminContext.Provider>
					</AdminQueryProvider>,
				);
			expect(wrap(<AdminRequests />).includes(`>${requestsCopy[locale].create}</button>`)).toBe(
				["owner", "support"].includes(role),
			);
			expect(wrap(<AdminStaff />)).not.toContain('type="password"');
		}
});
test("request contract forbids client subjects and closed states remain terminal", () => {
	expect(dataRequestInput.safeParse({ email: "contact@example.com", type: "export" }).success).toBe(
		true,
	);
	for (const extra of [{ userId: "unverified" }, { status: "completed" }, { dueAt: "tomorrow" }])
		expect(
			dataRequestInput.safeParse({ email: "contact@example.com", type: "export", ...extra })
				.success,
		).toBe(false);
	expect(dataRequestTransitions).toEqual({
		received: ["in_progress", "rejected"],
		in_progress: ["completed", "rejected"],
		completed: [],
		rejected: [],
	});
});
