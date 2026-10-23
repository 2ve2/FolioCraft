import { apiURL, domain, expect, openStudioSignedIn, switchLanguage, test } from "./fixtures";

for (const locale of ["ar", "en"] as const) {
	for (const width of [1440, 390]) {
		test(`studio frame precedes account data (${locale}, ${width})`, async ({
			page,
			accounts,
			context,
		}) => {
			test.setTimeout(150000);
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ reducedMotion: width === 390 ? "reduce" : "no-preference" });
			const account = await accounts.seed();
			await openStudioSignedIn(page, account, locale);
			await expect(page.locator(".onboarding")).toBeVisible();
			const site = await domain(context.request, "/api/sites", "POST", {
				slug: `e2e-${crypto.randomUUID()}`,
				locale,
			});
			let releaseSession: () => void = () => {};
			const sessionBarrier = new Promise<void>((resolve) => {
				releaseSession = resolve;
			});
			await page.route(`${apiURL}/api/auth/get-session**`, async (route) => {
				await sessionBarrier;
				await route.continue();
			});
			let release: () => void = () => {};
			const barrier = new Promise<void>((resolve) => {
				release = resolve;
			});
			await page.route(`${apiURL}/api/sites`, async (route) => {
				await barrier;
				await route.continue();
			});
			await page.addInitScript(() => {
				type LayoutState = { mark: number; entries: { time: number; value: number }[] };
				const layout: LayoutState = { mark: 0, entries: [] };
				(window as unknown as { studioLayout: LayoutState }).studioLayout = layout;
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
						if (!shift.hadRecentInput)
							layout.entries.push({ time: shift.startTime, value: shift.value });
					}
				}).observe({ type: "layout-shift", buffered: true });
				(window as unknown as { sawLoading: boolean }).sawLoading = false;
				new MutationObserver(() => {
					if (document.querySelector(".loading-screen"))
						(window as unknown as { sawLoading: boolean }).sawLoading = true;
				}).observe(document, { childList: true, subtree: true });
			});
			const siteRequest = page.waitForRequest(`${apiURL}/api/sites`);
			const sessionRequest = page.waitForRequest(`${apiURL}/api/auth/get-session**`);
			await page.reload();
			await Promise.all([siteRequest, sessionRequest]);
			const frame = async () =>
				page.evaluate(() =>
					Object.fromEntries(
						[
							".sidebar",
							".studio-header",
							".editor-panel",
							".preview-panel",
							".mobile-tabs",
							".preview-toolbar",
							".preview-expand",
							".preview-canvas",
							".browser-bar",
							".content-jump-nav",
							".editor-card",
							".studio-header .select-trigger",
						].map((selector) => {
							const r = document.querySelector(selector)?.getBoundingClientRect();
							return [selector, r ? [r.x, r.y, r.width, r.height] : []];
						}),
					),
				);
			let before: Record<string, number[]> = {};
			try {
				await expect(page.locator(".studio-header")).toBeVisible();
				// Phones show the menu button; the navigation itself waits in the closed drawer.
				if (width === 390) {
					await expect(page.locator(".menu-toggle")).toBeVisible();
					await expect(page.locator(".sidebar nav")).toBeHidden();
				} else await expect(page.locator(".sidebar nav")).toBeVisible();
				await expect(page.locator(".studio-shell")).toHaveAttribute("aria-busy", "true");
				await expect(page.locator('.studio-loading-status[role="status"]')).toHaveCount(1);
				await expect(page.locator("#studio-profile")).toHaveCount(0);
				await expect(page.locator(".sidebar .account")).not.toContainText(account.name);
				for (const button of await page.locator(".nav-item").all())
					await expect(button).toBeDisabled();
				await page.evaluate(() => document.fonts.ready.then(() => undefined));
				before = await frame();
				await page.evaluate(() => {
					(window as unknown as { studioLayout: { mark: number } }).studioLayout.mark =
						performance.now();
				});
				expect(
					await page
						.locator(".studio-placeholder")
						.first()
						.evaluate((element) => getComputedStyle(element).animationName),
				).toBe("none");
				await page.screenshot({ path: test.info().outputPath(`frame-${locale}-${width}.png`) });
				if (locale === "ar" && width === 1440) {
					await expect(page.getByRole("status")).toContainText("أطول من المعتاد", {
						timeout: 12000,
					});
				}
			} finally {
				releaseSession();
				release();
			}
			await expect(page.locator("#studio-profile input").first()).toBeEditable();
			await expect(page.locator(".studio-skeleton")).toHaveCount(0);
			const after = await frame();
			for (const [selector, bounds] of Object.entries(before)) {
				if (
					width === 390 &&
					[
						".preview-panel",
						".mobile-tabs",
						".preview-toolbar",
						".preview-expand",
						".preview-canvas",
						".browser-bar",
					].includes(selector)
				)
					continue;
				for (
					let index = 0;
					index < (width === 1440 && selector !== ".editor-card" ? 4 : 3);
					index++
				)
					expect(
						Math.abs(bounds[index] - after[selector][index]),
						`${selector} dimension ${index}`,
					).toBeLessThanOrEqual(1);
			}
			await page.screenshot({ path: test.info().outputPath(`loaded-${locale}-${width}.png`) });
			await page.waitForTimeout(100);
			const transitionCLS = await page.evaluate(() => {
				const layout = (
					window as unknown as {
						studioLayout: { mark: number; entries: { time: number; value: number }[] };
					}
				).studioLayout;
				return layout.entries
					.filter((entry) => entry.time >= layout.mark)
					.reduce((sum, entry) => sum + entry.value, 0);
			});
			console.log(JSON.stringify({ studioTransition: { locale, width, cls: transitionCLS } }));
			expect(transitionCLS).toBeLessThan(0.001);
			await expect(page.locator(".loading-screen")).toHaveCount(0);
			expect(
				await page.evaluate(() => (window as unknown as { sawLoading: boolean }).sawLoading),
			).toBe(false);
			expect(site.id).toBeTruthy();
		});
	}
}

test("a native cross-tab sign-out discards the held owned-site result", async ({
	page,
	context,
	accounts,
}) => {
	test.setTimeout(150000);
	const account = await accounts.seed();
	await openStudioSignedIn(page, account, "en");
	await expect(page.locator(".onboarding")).toBeVisible();
	await domain(context.request, "/api/sites", "POST", {
		slug: `e2e-${crypto.randomUUID()}`,
		locale: "en",
	});
	const other = await context.newPage();
	await other.goto("/en/studio");
	await expect(other.locator("#studio-profile input").first()).toBeEditable();
	let captured: () => void = () => {};
	const responseCaptured = new Promise<void>((resolve) => {
		captured = resolve;
	});
	let release: () => void = () => {};
	const barrier = new Promise<void>((done) => {
		release = done;
	});
	await page.route(`${apiURL}/api/sites`, async (route) => {
		const response = await route.fetch();
		captured();
		await barrier;
		await route.fulfill({ response });
	});
	const started = page.waitForRequest(`${apiURL}/api/sites`);
	await page.reload();
	await started;
	await responseCaptured;
	await expect(page.locator(".studio-skeleton")).toBeVisible();
	try {
		await other.getByRole("button", { name: "Sign out", exact: true }).click();
		await expect(other).toHaveURL(/\/en\/login$/);
		await expect(page).toHaveURL(/\/en\/login$/);
	} finally {
		release();
	}
	await expect(page.locator("#studio-profile")).toHaveCount(0);
	await expect(page.locator(".account")).toHaveCount(0);
	await other.close();
});

test("a cross-tab session notification reloads through the authenticated path", async ({
	page,
	context,
	accounts,
}) => {
	test.setTimeout(150000);
	const account = await accounts.seed();
	await openStudioSignedIn(page, account, "en");
	await expect(page.locator(".onboarding")).toBeVisible();
	const site = await domain(context.request, "/api/sites", "POST", {
		slug: `e2e-${crypto.randomUUID()}`,
		locale: "en",
	});
	const broadcaster = await context.newPage();
	await broadcaster.goto("/en/login");
	let captured: () => void = () => {};
	const responseCaptured = new Promise<void>((resolve) => {
		captured = resolve;
	});
	let release: () => void = () => {};
	const barrier = new Promise<void>((done) => {
		release = done;
	});
	let reads = 0;
	await page.route(`${apiURL}/api/sites`, async (route) => {
		reads++;
		if (reads === 1) {
			const response = await route.fetch();
			captured();
			await barrier;
			await route.fulfill({ response });
		} else await route.continue();
	});
	const started = page.waitForRequest(`${apiURL}/api/sites`);
	await page.reload();
	await started;
	await responseCaptured;
	await domain(context.request, `/api/sites/${site.id}/draft`, "PUT", {
		revision: site.revision,
		draft: { ...site.draft, profile: { ...site.draft.profile, name: "Fresh verified profile" } },
	});
	// The application mirrors native mutations with this identity-free, nonpersistent channel.
	await broadcaster.evaluate(() => {
		const channel = new BroadcastChannel("ichnara-session-change");
		channel.postMessage("changed");
		channel.close();
	});
	try {
		await expect.poll(() => reads).toBe(2);
		await expect(page.locator("#studio-profile input").first()).toBeEditable();
		await expect(page.locator("#studio-profile").getByLabel("Name", { exact: true })).toHaveValue(
			"Fresh verified profile",
		);
	} finally {
		release();
		await broadcaster.close();
	}
	await expect(page.locator(".loading-screen")).toHaveCount(0);
});

test("the language switch works while session verification is held", async ({ page }) => {
	let release: () => void = () => {};
	const barrier = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(`${apiURL}/api/auth/get-session**`, async (route) => {
		await barrier;
		await route.continue();
	});
	try {
		await page.goto("/ar/studio");
		await expect(page.locator(".studio-skeleton")).toBeVisible();
		await switchLanguage(page, "ar");
		await expect(page).toHaveURL(/\/en\/studio$/);
		await expect(page.getByRole("button", { name: "Studio language", exact: true })).toBeVisible();
		await expect(page.locator(".sidebar nav")).toContainText("Content");
	} finally {
		release();
	}
	await expect(page).toHaveURL(/\/en\/login$/);
});
