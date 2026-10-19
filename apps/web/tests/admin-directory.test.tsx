import { expect, test } from "bun:test";
import { permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import {
	AdminAccountDetail,
	AdminDirectory,
	AdminSiteDetail,
} from "../src/features/management/admin/admin-directory";
import { directoryCopy } from "../src/features/management/admin/directory-copy";

test("directory copy has exact bilingual parity and accessible filters", () => {
	expect(Object.keys(directoryCopy.ar).sort()).toEqual(Object.keys(directoryCopy.en).sort());
	for (const locale of ["ar", "en"] as const) {
		const wrap = (children: React.ReactNode) =>
			renderToStaticMarkup(
				<AdminContext.Provider
					value={{
						locale,
						setLocale: () => {},
						permissions: permissionsFor("owner"),
						user: { id: "owner", name: "Owner", email: "o***@example.com" },
					}}
				>
					{children}
				</AdminContext.Provider>,
			);
		for (const kind of ["accounts", "sites"] as const) {
			const html = wrap(<AdminDirectory kind={kind} />);
			expect(html).toContain(directoryCopy[locale][kind]);
			expect(html).toContain('role="status"');
		}
		expect(wrap(<AdminAccountDetail id="member" />)).not.toContain('type="password"');
		expect(wrap(<AdminSiteDetail id="site" />)).not.toContain('type="password"');
	}
});
