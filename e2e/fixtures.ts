import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import type { Site } from "@ichnara/contracts";
import { type APIRequestContext, test as base, expect, type Page } from "@playwright/test";

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
	await expect(page.locator(".onboarding, .studio-shell")).toBeVisible();
}

/** Keeps native cookies private in Playwright's per-test request context. */
export async function apiSignIn(request: APIRequestContext, account: Account) {
	const response = await request.post(`${apiURL}/api/auth/sign-in/email`, {
		headers: { Origin: webURL },
		data: { email: account.email, password: account.password },
	});
	expect(response.status()).toBe(200);
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
