import type { Page } from "@playwright/test";
import { apiURL, expect, test, webURL } from "./fixtures";

const hint = "ichnara-signed-in";

/**
 * Signs the browser in through the real API and opens the studio. Every local request shares one
 * loopback address, so when earlier specs used up the native sign-in budget this waits for the
 * window Better Auth reports instead of weakening the limit.
 */
async function openStudioSignedIn(
	page: Page,
	account: { email: string; password: string },
	locale: "ar" | "en",
) {
	for (let attempt = 0; ; attempt++) {
		const response = await page.context().request.post(`${apiURL}/api/auth/sign-in/email`, {
			headers: { Origin: webURL },
			data: { email: account.email, password: account.password },
		});
		if (response.status() !== 429 || attempt === 2) {
			expect(response.status()).toBe(200);
			break;
		}
		await page.waitForTimeout((Number(response.headers()["x-retry-after"] ?? 60) + 1) * 1_000);
	}
	await page.goto(`/${locale}/studio`);
	await expect(page.locator(".onboarding, .studio-shell")).toBeVisible();
}

test("the bare address opens the studio while signed in and the product page after sign-out", async ({
	page,
	context,
	accounts,
}) => {
	test.setTimeout(150_000);
	const account = await accounts.seed();
	await openStudioSignedIn(page, account, "ar");
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
	test.setTimeout(150_000);
	const account = await accounts.seed();
	await openStudioSignedIn(page, account, "en");
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
