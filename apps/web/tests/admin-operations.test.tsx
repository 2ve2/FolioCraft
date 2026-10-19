import { expect, test } from "bun:test";
import { noticeInput } from "@ichnara/contracts";
import { canViewAdmin, permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminActivityPage, AuditEvents } from "../src/features/management/admin/admin-activity";
import { AdminContext } from "../src/features/management/admin/admin-context";
import { AdminNotices } from "../src/features/management/admin/admin-notices";
import { AdminDashboard, AdminSystem } from "../src/features/management/admin/admin-system";
import { operationsCopy } from "../src/features/management/admin/operations-copy";

test("operations copy parity, permission-scoped navigation and notice mutation presentation", () => {
	expect(Object.keys(operationsCopy.ar).sort()).toEqual(Object.keys(operationsCopy.en).sort());
	for (const locale of ["ar", "en"] as const)
		for (const role of ["owner", "moderator", "support", "analyst"]) {
			const wrap = (children: React.ReactNode) =>
				renderToStaticMarkup(
					<AdminContext.Provider
						value={{
							locale,
							setLocale: () => {},
							permissions: permissionsFor(role),
							user: { id: "fixture", name: "Fixture", email: "f***@example.com" },
						}}
					>
						{children}
					</AdminContext.Provider>,
				);
			const notices = wrap(<AdminNotices />);
			expect(notices.includes(operationsCopy[locale].create)).toBe(role === "owner");
			expect(wrap(<AdminSystem />)).not.toContain("DATABASE_URL");
			expect(wrap(<AdminDashboard />)).not.toContain("password");
			const activity = wrap(<AdminActivityPage />);
			expect(activity.includes(operationsCopy[locale].export)).toBe(
				["owner", "analyst"].includes(role),
			);
			expect(canViewAdmin(permissionsFor(role), "system")).toBe(
				["owner", "analyst"].includes(role),
			);
			expect(canViewAdmin(permissionsFor(role), "notices")).toBe(true);
		}
});
test("attempt/outcome events share one group and require an explicit drawer action", () => {
	const html = renderToStaticMarkup(
		<AdminContext.Provider
			value={{
				locale: "en",
				setLocale: () => {},
				permissions: permissionsFor("owner"),
				user: { id: "fixture", name: "Fixture", email: "f***@example.com" },
			}}
		>
			<AuditEvents
				items={["attempted", "succeeded"].map((status, i) => ({
					id: String(i),
					actorId: "actor",
					requestId: "correlation",
					action: "notice.manage",
					targetType: "notice",
					targetId: "id",
					createdAt: "2026-10-19T00:00:00.000Z",
					reason: null,
					metadata: {},
					status: status as "attempted" | "succeeded",
				}))}
				open={() => {}}
			/>
		</AdminContext.Provider>,
	);
	expect(html.match(/correlation/g)?.length).toBe(1);
	expect(html.match(/Event details/g)?.length).toBe(1);
	expect(html).toContain("Attempted");
	expect(html).toContain("Succeeded");
});
test("notice contract rejects inverted windows, blank bilingual copy and unknown fields", () => {
	const valid = {
		kind: "info",
		messageAr: "تنبيه",
		messageEn: "Notice",
		active: true,
		startsAt: "2026-10-19T00:00:00.000Z",
		endsAt: "2026-10-20T00:00:00.000Z",
	};
	expect(noticeInput.safeParse(valid).success).toBe(true);
	for (const invalid of [
		{ ...valid, messageAr: " " },
		{ ...valid, endsAt: valid.startsAt },
		{ ...valid, createdBy: "forged" },
	])
		expect(noticeInput.safeParse(invalid).success).toBe(false);
});
