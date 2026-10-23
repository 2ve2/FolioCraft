import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { accountCopy } from "../src/features/studio/account/account-copy";
import { AccountSettings } from "../src/features/studio/account/account-settings";

const member = {
	id: "member",
	name: "Sara",
	email: "sara@example.test",
	emailVerified: true,
	role: "user",
};

test("account copy has exact bilingual parity, including every error message", () => {
	expect(Object.keys(accountCopy.ar).sort()).toEqual(Object.keys(accountCopy.en).sort());
	expect(Object.keys(accountCopy.ar.errors).sort()).toEqual(
		Object.keys(accountCopy.en.errors).sort(),
	);
	for (const locale of ["ar", "en"] as const)
		for (const value of Object.values(accountCopy[locale]))
			if (typeof value === "string") expect(value.trim().length).toBeGreaterThan(0);
});

test("members get a password-confirmed deletion form; staff accounts get the procedure note", () => {
	for (const locale of ["ar", "en"] as const) {
		const t = accountCopy[locale];
		const html = renderToStaticMarkup(
			<AccountSettings locale={locale} user={member} sessionId="s" exportDraft={() => {}} />,
		);
		expect(html).toContain(t.deleteButton);
		expect(html).toContain(t.confirmLabel);
		expect(html).toContain('autoComplete="current-password"');
		expect(html).toContain(t.emailHintVerified);
		expect(html).not.toContain(t.staffNote);
		const staff = renderToStaticMarkup(
			<AccountSettings
				locale={locale}
				user={{ ...member, role: "moderator" }}
				sessionId="s"
				exportDraft={() => {}}
			/>,
		);
		expect(staff).toContain(t.staffNote);
		expect(staff).not.toContain(t.deleteButton);
	}
});
