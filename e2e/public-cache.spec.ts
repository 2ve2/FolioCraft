import { apiSignIn, domain, expect, test, webURL } from "./fixtures";

test("missing portfolios preserve dynamic language output and publishing after a miss produces a real cache hit", async ({
	accounts,
	context,
	page,
}) => {
	const slug = `e2e-${crypto.randomUUID()}`;
	for (const locale of ["ar", "en"]) {
		await context.setExtraHTTPHeaders({ "accept-language": locale });
		const response = await context.request.get(`${webURL}/p/${slug}`, {
			headers: { "accept-language": locale },
		});
		expect(response.status()).toBe(404);
		expect(response.headers()["cache-control"]).toContain("no-store");
		const original = await context.request.get(`http://127.0.0.1:4301/p/${slug}`, {
			headers: { "accept-language": locale },
		});
		expect(original.status()).toBe(404);
		const languageOutput = (html: string) =>
			html.match(/<html[^>]*>|<h1[^>]*>.*?<\/h1>|<title>.*?<\/title>/g);
		expect(languageOutput(await response.text())).toEqual(languageOutput(await original.text()));
	}
	const account = await accounts.seed();
	await apiSignIn(context.request, account);
	let site = await domain(context.request, "/api/sites", "POST", { slug, locale: "en" });
	site = await domain(context.request, `/api/sites/${site.id}/draft`, "PUT", {
		revision: site.revision,
		draft: {
			...site.draft,
			profile: { ...site.draft.profile, name: "Published after missing", role: "Designer" },
		},
	});
	await domain(context.request, `/api/sites/${site.id}/releases`, "POST", {
		revision: site.revision,
	});
	expect((await page.goto(`/p/${slug}`))?.status()).toBe(200);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Published after missing.");
	const warmed = await page.reload();
	expect(warmed?.headers()["x-nextjs-cache"]).toBe("HIT");
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
