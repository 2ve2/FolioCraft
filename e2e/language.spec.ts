import { domain, expect, signIn, test } from "./fixtures";
import { expectSingleLanguage } from "./language";

for (const locale of ["ar", "en"] as const) {
	for (const path of [
		"",
		"/login",
		"/signup",
		"/privacy",
		"/terms",
		"/content-policy",
		"/forgot-password",
		"/reset-password",
		"/verify-email",
		"/does-not-exist",
	]) {
		test(`single-language platform ${locale}${path || "/"}`, async ({ page }) => {
			await page.goto(`/${locale}${path}`);
			await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
			await expect(page.locator("html")).toHaveAttribute("lang", locale);
			await expectSingleLanguage(page, locale);
			if (path === "/privacy") {
				await expect(page.getByText(/Sentry/)).toBeVisible();
				await expect(page.getByText(/UptimeRobot/)).toBeVisible();
				await expect(page.getByRole("note")).toContainText(
					locale === "ar" ? "مسودة قيد المراجعة" : "Draft under review",
				);
			}
		});
	}
	test(`single-language onboarding, studio sections and admin denial (${locale})`, async ({
		page,
		accounts,
		context,
	}) => {
		const account = await accounts.seed();
		await signIn(page, account, locale);
		await expectSingleLanguage(page, locale, [account.name, account.email]);
		const site = await domain(context.request, "/api/sites", "POST", {
			slug: `e2e-${crypto.randomUUID()}`,
			locale,
		});
		await page.reload();
		await expect(page.locator(".studio-shell")).toBeVisible();
		for (const section of locale === "ar"
			? ["المحتوى", "المظهر", "الإعدادات", "الرسائل والنشر"]
			: ["Content", "Appearance", "Settings", "Inbox & releases"]) {
			await page.getByRole("button", { name: section, exact: true }).click();
			await expect(page.locator(".page-breadcrumb b")).toHaveText(section);
			await expectSingleLanguage(page, locale, [
				account.name,
				account.email,
				account.name[0],
				site.slug,
			]);
		}
		await page.goto(`/${locale}/admin`);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			locale === "ar" ? "يلزم حساب مسؤول" : "Administrator access required",
		);
		await expectSingleLanguage(page, locale);
	});
}

for (const locale of ["ar", "en"] as const) {
	test(`language checker detects all four surfaces and excludes hidden artwork (${locale})`, async ({
		page,
	}) => {
		await page.goto(`/${locale}/login`);
		const foreign = locale === "ar" ? "Untranslated" : "غير مترجم";
		await page.evaluate((value) => {
			const hidden = document.createElement("span");
			hidden.setAttribute("aria-hidden", "true");
			hidden.textContent = value;
			document.body.append(hidden);
		}, foreign);
		await expectSingleLanguage(page, locale);
		for (const surface of ["text", "placeholder", "aria-label", "title"]) {
			const title = await page.title();
			await page.evaluate(
				({ value, surface }) => {
					const input = document.createElement("input");
					input.id = "e2e-checker-probe";
					if (surface === "title") document.title = value;
					else if (surface === "text") {
						const text = document.createElement("p");
						text.id = input.id;
						text.textContent = value;
						document.body.append(text);
					} else input.setAttribute(surface, value);
					if (surface !== "text") document.body.append(input);
				},
				{ value: foreign, surface },
			);
			await expect(expectSingleLanguage(page, locale)).rejects.toThrow("Mixed language");
			await page.evaluate((originalTitle) => {
				document.getElementById("e2e-checker-probe")?.remove();
				document.title = originalTitle;
			}, title);
		}
	});
}
