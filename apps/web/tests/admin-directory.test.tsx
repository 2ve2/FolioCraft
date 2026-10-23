import { expect, test } from "bun:test";
import { permissionsFor } from "@ichnara/contracts/admin-policy";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminContext } from "../src/features/management/admin/admin-context";
import {
	AdminAccountDetail,
	AdminDirectory,
	AdminSiteDetail,
} from "../src/features/management/admin/admin-directory";
import { AdminQueryProvider } from "../src/features/management/admin/admin-query";
import { directoryCopy } from "../src/features/management/admin/directory-copy";

test("directory copy has exact bilingual parity and accessible filters", () => {
	expect(Object.keys(directoryCopy.ar).sort()).toEqual(Object.keys(directoryCopy.en).sort());
	expect(directoryCopy.en.search).toBe("Search by name only");
	expect(directoryCopy.ar.search).toBe("البحث بالاسم فقط");
	for (const locale of ["ar", "en"] as const) {
		const wrap = (children: React.ReactNode) =>
			renderToStaticMarkup(
				<AdminQueryProvider>
					<AdminContext.Provider
						value={{
							locale,
							setLocale: () => {},
							permissions: permissionsFor("owner"),
							user: { id: "owner", name: "Owner", email: "o***@example.com" },
						}}
					>
						{children}
					</AdminContext.Provider>
				</AdminQueryProvider>,
			);
		for (const kind of ["accounts", "sites"] as const) {
			const html = wrap(<AdminDirectory kind={kind} />);
			expect(html).toContain(directoryCopy[locale][kind]);
			expect(html).toContain('role="status"');
			if (kind === "accounts") expect(html).toContain(directoryCopy[locale].search);
		}
		expect(wrap(<AdminAccountDetail id="member" />)).not.toContain('type="password"');
		expect(wrap(<AdminSiteDetail id="site" />)).not.toContain('type="password"');
	}
});
