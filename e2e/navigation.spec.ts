import { apiSignIn, domain, expect, test } from "./fixtures";

for (const locale of ["ar", "en"] as const) {
	test(`phone studio navigation opens as a drawer from the menu button (${locale})`, async ({
		page,
		context,
		accounts,
	}) => {
		test.setTimeout(120_000);
		const ar = locale === "ar";
		const account = await accounts.seed();
		await apiSignIn(context.request, account);
		await domain(context.request, "/api/sites", "POST", { slug: `nav-${Date.now()}`, locale });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`/${locale}/studio`);
		await expect(page.locator(".studio-shell:not([aria-busy])")).toBeVisible();

		const toggle = page.getByRole("button", { name: ar ? "فتح القائمة" : "Open menu" });
		const drawer = page.locator("#studio-menu");
		const nav = drawer.getByRole("navigation");
		// Closed: only the brand and the menu button occupy the top bar.
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await expect(nav).toBeHidden();

		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await expect(nav).toBeVisible();
		await expect(
			drawer.getByRole("button", { name: ar ? "تسجيل الخروج" : "Sign out" }),
		).toBeVisible();
		// The drawer slides in from the reading-start edge and comes to rest fully on screen.
		await expect
			.poll(async () => {
				const box = await drawer.boundingBox();
				return box ? Math.round(ar ? box.x + box.width : box.x) : -1;
			})
			.toBe(ar ? 390 : 0);
		expect((await drawer.boundingBox())?.width).toBeLessThanOrEqual(300);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

		// Choosing a section closes the drawer and returns focus to the menu button.
		await nav.getByRole("button", { name: ar ? "المظهر" : "Appearance" }).click();
		await expect(nav).toBeHidden();
		await expect(toggle).toBeFocused();
		await expect(page.locator(".section-heading .eyebrow")).toContainText(
			ar ? "المظهر" : "Appearance",
		);

		// Escape and the close button both close it; Tab stays inside while it is open.
		await toggle.click();
		await expect(nav).toBeVisible();
		for (let step = 0; step < 12; step++) await page.keyboard.press("Tab");
		expect(
			await page.evaluate(() => Boolean(document.activeElement?.closest("#studio-menu"))),
		).toBe(true);
		await page.keyboard.press("Escape");
		await expect(nav).toBeHidden();
		await expect(toggle).toBeFocused();
		await toggle.click();
		await drawer.getByRole("button", { name: ar ? "إغلاق القائمة" : "Close menu" }).click();
		await expect(nav).toBeHidden();

		// Widening to desktop shows the fixed sidebar and hides the menu button.
		await page.setViewportSize({ width: 1280, height: 900 });
		await expect(toggle).toBeHidden();
		await expect(nav).toBeVisible();
	});
}
