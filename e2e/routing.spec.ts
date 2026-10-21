import { expect, switchLanguage, test, webURL } from "./fixtures";

for (const locale of ["ar", "en"] as const) {
	test.describe(locale, () => {
		test.use({ locale: locale === "ar" ? "ar-SA" : "en-US" });
		test("browser negotiation, cookie precedence and legacy query preservation", async ({
			page,
			context,
		}) => {
			await page.goto("/");
			await expect(page).toHaveURL(`${webURL}/${locale}`);
			const other = locale === "ar" ? "en" : "ar";
			await context.addCookies([{ name: "ichnara-locale", value: other, url: webURL }]);
			await page.goto("/");
			await expect(page).toHaveURL(`${webURL}/${other}`);
			await page.goto("/login?lang=ar&from=admin");
			await expect(page).toHaveURL(`${webURL}/ar/login?lang=ar&from=admin`);
		});

		test("soft navigation preserves the document without a loading-screen flash", async ({
			page,
		}) => {
			await page.goto(`/${locale}`);
			// A stateful control proves hydration before the document sentinel is installed.
			await page
				.getByRole("button", {
					name: locale === "ar" ? "لغة الاستوديو" : "Studio language",
					exact: true,
				})
				.click();
			await expect(page.getByRole("listbox")).toBeVisible();
			await page.keyboard.press("Escape");
			const marker = crypto.randomUUID();
			await page.evaluate((value) => {
				document.documentElement.dataset.e2eDocument = value;
				document.documentElement.dataset.e2eLoading = "false";
				new MutationObserver((mutations) => {
					for (const mutation of mutations)
						for (const node of mutation.addedNodes) {
							if (
								node instanceof Element &&
								(node.matches(".loading-screen") || node.querySelector(".loading-screen"))
							)
								document.documentElement.dataset.e2eLoading = "true";
						}
				}).observe(document.documentElement, { subtree: true, childList: true });
			}, marker);
			for (const path of ["/login", "/signup", "/privacy", "/terms", ""]) {
				await page.locator(`a[href="/${locale}${path}"]`).first().click();
				await expect(page).toHaveURL(`${webURL}/${locale}${path}`);
				await expect(page.locator("html")).toHaveAttribute("data-e2e-document", marker);
				await expect(page.locator("html")).toHaveAttribute("data-e2e-loading", "false");
				await expect(page.locator(".loading-screen")).toHaveCount(0);
			}
		});

		test("language switching keeps path/query/hash and Back returns to the prior page", async ({
			page,
		}) => {
			await page.goto(`/${locale}/login`);
			await page.locator(`a[href="/${locale}/signup"]`).first().click();
			await expect(page).toHaveURL(`${webURL}/${locale}/signup`);
			await page.evaluate(() =>
				history.replaceState(history.state, "", `${location.pathname}?from=admin#auth-title`),
			);
			await switchLanguage(page, locale);
			const other = locale === "ar" ? "en" : "ar";
			await expect(page).toHaveURL(`${webURL}/${other}/signup?from=admin#auth-title`);
			await expect(page.locator("html")).toHaveAttribute("lang", other);
			await page.goBack();
			await expect(page).toHaveURL(`${webURL}/${locale}/login`);
		});

		test("localized unknown platform path returns a real 404", async ({ page }) => {
			const response = await page.goto(`/${locale}/does-not-exist`);
			expect(response?.status()).toBe(404);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				locale === "ar" ? "هذه الصفحة غير موجودة" : "This page is out of the picture.",
			);
		});
	});
}

test("Arabic login is already localized in server HTML", async ({ request }) => {
	const response = await request.get(`${webURL}/ar/login`);
	expect(response.status()).toBe(200);
	const html = await response.text();
	expect(html).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
	expect(html).toMatch(/<h1[^>]*>تسجيل الدخول<\/h1>/);
});

test("unsupported prefix and a missing published portfolio return 404", async ({ page }) => {
	for (const path of ["/fr/login", `/p/missing-${crypto.randomUUID()}`]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	}
});
