import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { type APIRequestContext, test as base, expect, type Page } from "@playwright/test";
import type { Site } from "../packages/contracts/src";

export const apiURL = "http://127.0.0.1:4400";
export const webURL = "http://127.0.0.1:4300";
export type Locale = "ar" | "en";
type Account = { email: string; password: string; name: string };
type Fixtures = {
	accounts: { fresh: () => Account; seed: () => Promise<Account> };
	localNetwork: undefined;
};

/** Uses the existing guarded fixture approach without adding an application bypass endpoint. */
function fixture(input: object) {
	const result = spawnSync("bun", ["--no-env-file", "e2e/seed.ts"], {
		cwd: resolve(import.meta.dirname, ".."),
		env: process.env,
		input: JSON.stringify(input),
		encoding: "utf8",
	});
	if (result.status !== 0) throw new Error("Guarded local fixture failed");
}

export const test = base.extend<Fixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured fixture arguments.
	accounts: async ({}, use) => {
		const accounts: Account[] = [];
		const fresh = () => {
			const nonce = crypto.randomUUID();
			const account = {
				email: `e2e-${nonce}@example.com`,
				password: `Disposable-${nonce}`,
				name: "E2E account",
			};
			accounts.push(account);
			return account;
		};
		try {
			await use({
				fresh,
				seed: async () => {
					const account = fresh();
					fixture({ action: "create", ...account });
					return account;
				},
			});
		} finally {
			for (const account of accounts) fixture({ action: "remove", email: account.email });
		}
	},
	localNetwork: [
		async ({ context }, use) => {
			const external: string[] = [];
			await context.route("**/*", async (route) => {
				const url = new URL(route.request().url());
				if ([webURL, apiURL].includes(url.origin)) await route.continue();
				else {
					external.push(`${url.origin}${url.pathname}`);
					await route.abort("blockedbyclient");
				}
			});
			await use(undefined);
			expect(external, "No browser request may reach hosted services").toEqual([]);
		},
		{ auto: true },
	],
});
export { expect };

/** Signs in through the real form and waits for session-backed onboarding or the editor. */
export async function signIn(page: Page, account: Account, locale: Locale) {
	await page.goto(`/${locale}/login`);
	await page.locator('input[name="email"]').fill(account.email);
	await page.locator('input[name="password"]').fill(account.password);
	await page.locator('button[type="submit"]').click();
	await expect(page).toHaveURL(`${webURL}/${locale}/studio`);
	await expect(page.locator(".onboarding, .studio-shell:not([aria-busy])")).toBeVisible();
}

/** Keeps native cookies private in Playwright's per-test request context. */
/** Signs in through the API, waiting out the shared loopback sign-in limit (10 per minute). */
export async function apiSignIn(request: APIRequestContext, account: Account) {
	for (let attempt = 0; ; attempt++) {
		const response = await request.post(`${apiURL}/api/auth/sign-in/email`, {
			headers: { Origin: webURL },
			data: { email: account.email, password: account.password },
		});
		if (response.status() !== 429 || attempt === 2) {
			expect(response.status()).toBe(200);
			return;
		}
		const wait = (Number(response.headers()["x-retry-after"] ?? 60) + 1) * 1_000;
		// The wait is the limit's, not the journey's: extend the test budget by exactly that long.
		test.info().setTimeout(test.info().timeout + wait);
		await new Promise((resolve) => setTimeout(resolve, wait));
	}
}

/** Asserts actual domain protocol success before returning its validated server state. */
export async function domain<T = Site>(
	request: APIRequestContext,
	path: string,
	method = "GET",
	data?: unknown,
): Promise<T> {
	const response = await request.fetch(`${apiURL}${path}`, {
		method,
		headers: { Origin: webURL },
		data,
	});
	expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
	return (await response.json()).result;
}

/** Selects the visible language option and waits for the corresponding route. */
export async function switchLanguage(page: Page, from: Locale) {
	await page
		.getByRole("button", { name: from === "ar" ? "لغة الاستوديو" : "Studio language", exact: true })
		.click();
	await page.getByRole("option", { name: from === "ar" ? /English/ : /العربية/ }).click();
}

/**
 * Signs the browser in through the real API and opens the studio. Every local request shares one
 * loopback address, so when earlier specs used up the native sign-in budget this waits for the
 * window Better Auth reports instead of weakening the limit.
 */
export async function openStudioSignedIn(
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
	await expect(page.locator(".onboarding, .studio-shell:not([aria-busy])")).toBeVisible();
}
