import {
	apiSignIn,
	apiURL,
	domain,
	expect,
	signIn,
	switchLanguage,
	test,
	webURL,
} from "./fixtures";

for (const locale of ["ar", "en"] as const) {
	test(`signup, sign-in, save-before-language-switch, publish isolation and unpublish (${locale})`, async ({
		page,
		accounts,
		context,
	}) => {
		const account = accounts.fresh();
		const slug = `e2e-${crypto.randomUUID()}`;
		await page.goto(`/${locale}/signup`);
		await page.locator('input[name="name"]').fill(account.name);
		await page.locator('input[name="email"]').fill(account.email);
		await page.locator('input[name="password"]').fill(account.password);
		await page.locator('button[type="submit"]').click();
		// NODE_ENV=test does not require email verification, even with the trial flag false.
		await expect(page).toHaveURL(`${webURL}/${locale}/studio`);
		await page.locator('input[name="slug"]').fill(slug);
		await page.locator('button[type="submit"]').click();
		await expect(page.locator(".studio-shell")).toBeVisible();
		await page
			.getByRole("button", { name: locale === "ar" ? "تسجيل الخروج" : "Sign out", exact: true })
			.click();
		await expect(page).toHaveURL(`${webURL}/${locale}/login`);
		await signIn(page, account, locale);

		const name = locale === "ar" ? "اسم منشور للاختبار" : "Published test profile";
		const other = locale === "ar" ? "en" : "ar";
		// Hold the real save response until the test verifies the switch cannot depart early.
		let releaseSave: () => void = () => {};
		const saveBarrier = new Promise<void>((resolve) => {
			releaseSave = resolve;
		});
		await page.route(
			`${apiURL}/api/sites/*/draft`,
			async (route) => {
				if (route.request().method() !== "PUT") return route.continue();
				await saveBarrier;
				await route.continue();
			},
			{ times: 1 },
		);
		const saving = page.waitForRequest(
			(request) => request.method() === "PUT" && request.url().endsWith("/draft"),
		);
		await page
			.locator("#studio-profile")
			.getByLabel(locale === "ar" ? "التخصص أو المسمى" : "Specialty or title", { exact: true })
			.fill(locale === "ar" ? "مصمم" : "Designer");
		await page
			.locator("#studio-profile")
			.getByLabel(locale === "ar" ? "الاسم" : "Name", { exact: true })
			.fill(name);

		try {
			await switchLanguage(page, locale);
			await saving;
			// A switch that did not wait for the save would land within one RSC round trip, so the
			// held save must keep the studio on its language for this whole window.
			await expect(
				page.waitForURL(`${webURL}/${other}/studio`, { timeout: 2_000 }),
			).rejects.toThrow();
			expect(new URL(page.url()).pathname).toBe(`/${locale}/studio`);
		} finally {
			releaseSave();
		}
		await expect(page).toHaveURL(`${webURL}/${other}/studio`);
		await expect(
			page
				.locator("#studio-profile")
				.getByLabel(other === "ar" ? "الاسم" : "Name", { exact: true }),
		).toHaveValue(name);
		const site = await domain(context.request, "/api/sites");
		expect(site.draft.profile.name).toBe(name);

		const published = page.waitForResponse(
			(response) => response.request().method() === "POST" && response.url().endsWith("/releases"),
		);
		await page
			.getByRole("button", { name: other === "ar" ? "نشر الموقع" : "Publish website", exact: true })
			.click();
		expect((await published).status()).toBe(200);
		const publicPage = await context.newPage();
		expect((await publicPage.goto(`/p/${slug}`))?.status()).toBe(200);
		await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(`${name}.`);
		await expect(publicPage.locator("html")).toHaveAttribute("lang", locale);
		await expect(publicPage.locator("html")).toHaveAttribute(
			"dir",
			locale === "ar" ? "rtl" : "ltr",
		);

		const draftName = locale === "ar" ? "تعديل خاص غير منشور" : "Private unpublished edit";
		const saved = page.waitForResponse(
			(response) => response.request().method() === "PUT" && response.url().endsWith("/draft"),
		);
		await page
			.locator("#studio-profile")
			.getByLabel(other === "ar" ? "الاسم" : "Name", { exact: true })
			.fill(draftName);
		expect((await saved).status()).toBe(200);
		expect((await domain(context.request, "/api/sites")).draft.profile.name).toBe(draftName);
		await publicPage.reload();
		await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(`${name}.`);
		await expect(publicPage.getByText(draftName, { exact: true })).toHaveCount(0);
		const publicResponse = await context.request.get(`${apiURL}/api/public/sites/${slug}`);
		expect(publicResponse.status()).toBe(200);
		expect(await publicResponse.text()).not.toContain(draftName);

		await page
			.getByRole("button", { name: other === "ar" ? "الإعدادات" : "Settings", exact: true })
			.click();
		page.once("dialog", (dialog) => dialog.accept());
		const unpublished = page.waitForResponse(
			(response) => response.url().endsWith("/unpublish") && response.request().method() === "POST",
		);
		await page
			.getByRole("button", { name: other === "ar" ? "إلغاء النشر" : "Unpublish", exact: true })
			.click();
		expect((await unpublished).status()).toBe(200);
		expect((await publicPage.reload())?.status()).toBe(404);
		expect((await context.request.get(`${apiURL}/api/public/sites/${slug}`)).status()).toBe(404);
	});

	test(`non-admin cannot view administration or fetch protected data (${locale})`, async ({
		page,
		context,
		accounts,
	}) => {
		const account = await accounts.seed();
		await signIn(page, account, locale);
		for (const path of ["/admin", "/admin/accounts", "/admin/sites", "/admin/activity"]) {
			await page.goto(`/${locale}${path}`);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				locale === "ar" ? "يلزم حساب مسؤول" : "Administrator access required",
			);
		}
		for (const path of ["/api/admin/me/permissions", "/api/admin/accounts", "/api/admin/sites"]) {
			const response = await context.request.get(`${apiURL}${path}`);
			expect(response.status()).toBe(403);
		}
	});
}

test("another account cannot read or mutate an owned site", async ({ playwright, accounts }) => {
	const a = await accounts.seed();
	const b = await accounts.seed();
	const owner = await playwright.request.newContext();
	const stranger = await playwright.request.newContext();
	try {
		await apiSignIn(owner, a);
		await apiSignIn(stranger, b);
		const site = await domain(owner, "/api/sites", "POST", {
			slug: `e2e-${crypto.randomUUID()}`,
			locale: "en",
		});
		for (const [path, method, data] of [
			[`/api/sites/${site.id}`, "GET", undefined],
			[`/api/sites/${site.id}/preview`, "GET", undefined],
			[`/api/sites/${site.id}/draft`, "PUT", { revision: site.revision, draft: site.draft }],
			[
				`/api/sites/${site.id}`,
				"PATCH",
				{ revision: site.revision, slug: `e2e-${crypto.randomUUID()}` },
			],
			[`/api/sites/${site.id}/releases`, "POST", { revision: site.revision }],
			[`/api/sites/${site.id}/unpublish`, "POST", undefined],
		] as const) {
			const response = await stranger.fetch(`${apiURL}${path}`, {
				method,
				headers: { Origin: webURL },
				data,
			});
			expect([403, 404], `${method} ${path}`).toContain(response.status());
		}
		const unchanged = await domain(owner, `/api/sites/${site.id}`);
		expect(unchanged).toEqual(site);
	} finally {
		await owner.dispose();
		await stranger.dispose();
	}
});
