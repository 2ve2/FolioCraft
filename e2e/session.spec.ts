import { apiURL, expect, signIn, test, webURL } from "./fixtures";

const hint = "ichnara-signed-in";

test("the bare address opens the studio while signed in and the product page after sign-out", async ({
	page,
	context,
	accounts,
}) => {
	const account = await accounts.seed();
	await signIn(page, account, "ar");
	await expect
		.poll(async () => (await context.cookies()).find((cookie) => cookie.name === hint)?.value)
		.toBe("1");
	await page.goto("/");
	await expect(page).toHaveURL(`${webURL}/ar/studio`);
	await expect(page.locator(".onboarding, .studio-shell")).toBeVisible();
	// The language prefix still shows the product page to a signed-in visitor.
	await page.goto("/ar");
	await expect(page).toHaveURL(`${webURL}/ar`);
	await expect(page.locator(".welcome-page")).toBeVisible();

	await page.goto("/ar/studio");
	await page.getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
	await expect(page).toHaveURL(`${webURL}/ar/login`);
	await expect
		.poll(async () => (await context.cookies()).some((cookie) => cookie.name === hint))
		.toBe(false);
	await page.goto("/");
	await expect(page).toHaveURL(`${webURL}/ar`);
});

test("a stale signed-in hint without a session leads to sign-in and is dropped", async ({
	page,
	context,
}) => {
	await context.addCookies([{ name: hint, value: "1", url: webURL }]);
	await page.goto("/");
	await expect(page).toHaveURL(`${webURL}/en/login`);
	await expect
		.poll(async () => (await context.cookies()).some((cookie) => cookie.name === hint))
		.toBe(false);
});

test("a failed session re-check on returning to the tab keeps the open studio", async ({
	page,
	accounts,
}) => {
	const account = await accounts.seed();
	await signIn(page, account, "en");
	const workspace = page.locator(".onboarding, .studio-shell");
	await expect(workspace).toBeVisible();
	await page.route(`${apiURL}/api/auth/get-session**`, (route) =>
		route.fulfill({ status: 503, body: "{}" }),
	);
	const recheck = page.waitForRequest(`${apiURL}/api/auth/get-session**`);
	// Better Auth ignores tab returns within five seconds of its previous session request.
	await page.waitForTimeout(5_500);
	await page.evaluate(() => {
		const visibility = (state: DocumentVisibilityState) =>
			Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
		visibility("hidden");
		document.dispatchEvent(new Event("visibilitychange"));
		visibility("visible");
		document.dispatchEvent(new Event("visibilitychange"));
	});
	await recheck;
	await page.waitForTimeout(500);
	await expect(workspace).toBeVisible();
	await expect(page.locator(".loading-screen")).toHaveCount(0);
});
