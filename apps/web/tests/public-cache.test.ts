import { afterAll, expect, spyOn, test } from "bun:test";
import { newId } from "@ichnara/contracts";
import { portfolioTags, REVALIDATION_PATH } from "@ichnara/contracts/public-cache";
import createTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import incrementalCache, { portfolioCacheKey } from "../portfolio-incremental-cache";
import { internalRevalidation, portfolioWorker, withPortfolioRender } from "../portfolio-worker";
import { revalidatePortfolio } from "../src/lib/revalidate-portfolio";

const contextKey = Symbol.for("__cloudflare-context__");
const globals = globalThis as unknown as Record<string | symbol, unknown>;
const previousContext = globals[contextKey];
const previousConfig = globals.openNextConfig;
afterAll(() => {
	globals[contextKey] = previousContext;
	globals.openNextConfig = previousConfig;
});

test("patched official adapter rejects exhausted writes and never calls an unchecked read a valid hit", async () => {
	let attempts = 0;
	globals.openNextConfig = {};
	globals[contextKey] = {
		env: {
			NEXT_TAG_CACHE_DO_SHARDED: {
				idFromName: (key: string) => key,
				get: () => ({
					async writeTags() {
						attempts++;
						throw new Error("SYNTHETIC_DO_FAILURE");
					},
					async getTagData() {
						throw new Error("SYNTHETIC_DO_FAILURE");
					},
				}),
			},
		},
		ctx: { waitUntil() {} },
	};
	const logs = spyOn(console, "error").mockImplementation(() => {});
	try {
		const cache = createTagCache({ baseShardSize: 1, regionalCache: false });
		await expect(
			cache.writeTags([{ tag: "ichnara:portfolio:slug:fixture", expire: Date.now() }]),
		).rejects.toThrow("SYNTHETIC_DO_FAILURE");
		expect(attempts).toBe(4);
		await expect(cache.hasBeenRevalidated(["fixture"], 1)).rejects.toThrow();
		await expect(cache.getLastRevalidated(["fixture"])).rejects.toThrow();
		await expect(cache.isStale(["fixture"], 1)).rejects.toThrow();
	} finally {
		logs.mockRestore();
	}
});

test("incremental storage excludes unrelated/data/error/cookie entries and retains render-start before a late upload", async () => {
	const entries = new Map<string, unknown>();
	globals[contextKey] = {
		env: {
			NEXT_INC_CACHE_R2_BUCKET: {
				async put(key: string, json: string) {
					entries.set(key, JSON.parse(json));
				},
				async get(key: string) {
					return entries.has(key)
						? {
								uploaded: new Date(Date.now() + 60000),
								async json() {
									return entries.get(key);
								},
							}
						: null;
				},
			},
		},
	};
	const key = "/ichnara-isr/p/fixture";
	for (const status of [404, 500])
		await withPortfolioRender(() =>
			incrementalCache.set(key, { type: "app", html: "unavailable", meta: { status } }),
		);
	await withPortfolioRender(() =>
		incrementalCache.set(key, {
			type: "app",
			html: "cookie",
			meta: { headers: { "Set-Cookie": "synthetic" } },
		}),
	);
	await withPortfolioRender(() =>
		incrementalCache.set("/en/studio", { type: "app", html: "private" }),
	);
	await withPortfolioRender(() =>
		incrementalCache.set(
			"draft-data",
			{ kind: "FETCH", data: { headers: {}, body: "private", url: "" } },
			"fetch",
		),
	);
	expect(entries.size).toBe(0);
	const started = Date.now();
	await withPortfolioRender(() =>
		incrementalCache.set(key, { type: "app", html: "published", meta: { status: 200 } }),
	);
	expect(entries.size).toBe(1);
	const read = await incrementalCache.get(key);
	expect(read?.lastModified).toBeGreaterThanOrEqual(started);
	expect(read?.lastModified).toBeLessThanOrEqual(Date.now());
	expect(read?.value).toMatchObject({ html: "published" });
	expect(portfolioCacheKey(`route-cache/APP_PAGE/${"a".repeat(64)}/$/ichnara-isr/p/fixture`)).toBe(
		true,
	);
	expect(portfolioCacheKey("route-cache/APP_PAGE/hash/$/en/admin")).toBe(false);
});

test("secret validation rejects absent/wrong secrets and expires exactly the site and slug tags", async () => {
	const secret = "synthetic-revalidation-only-at-least-32-characters";
	const input = { siteId: newId(), slug: "public-cache-test", deliveryId: newId() };
	const sent: string[] = [];
	const message = (authorization?: string) =>
		new Request(`http://localhost${REVALIDATION_PATH}`, {
			method: "POST",
			headers: { ...(authorization && { authorization }), "content-type": "application/json" },
			body: JSON.stringify(input),
		});
	expect((await revalidatePortfolio(message(), secret, (tag) => sent.push(tag))).status).toBe(401);
	expect(
		(await revalidatePortfolio(message("Bearer wrong"), secret, (tag) => sent.push(tag))).status,
	).toBe(401);
	expect(sent).toHaveLength(0);
	expect(
		(await revalidatePortfolio(message(`Bearer ${secret}`), secret, (tag) => sent.push(tag)))
			.status,
	).toBe(204);
	expect(sent.slice(0, 2)).toEqual(portfolioTags(input.siteId, input.slug));
	expect(sent[2]).toBe(`ichnara:portfolio:ack:${input.deliveryId}`);
});

test("runtime off bypasses existing ISR; public internal paths reject even with a secret; enabled documents rewrite only", async () => {
	const paths: string[] = [];
	const original = new Response("original dynamic bytes", {
		headers: { "x-original": "unchanged" },
	});
	const worker = portfolioWorker({
		async fetch(message) {
			paths.push(new URL(message.url).pathname);
			return original;
		},
	});
	const context = { waitUntil() {} };
	expect(await worker.fetch(new Request("https://web.test/p/fixture"), {}, context)).toBe(original);
	expect(paths).toEqual(["/p/fixture"]);
	for (const pathname of [REVALIDATION_PATH, "/ichnara-isr/p/fixture"]) {
		expect(
			(
				await worker.fetch(
					new Request(`https://web.test${pathname}`, {
						headers: { authorization: "Bearer synthetic" },
					}),
					{ PORTFOLIO_CACHE_ENABLED: "true" },
					context,
				)
			).status,
		).toBe(404);
	}
	await worker.fetch(
		new Request("https://web.test/p/fixture/projects/project"),
		{
			PORTFOLIO_CACHE_ENABLED: "true",
			NEXT_INC_CACHE_R2_BUCKET: true,
			NEXT_TAG_CACHE_DO_SHARDED: true,
		},
		context,
	);
	expect(paths.at(-1)).toBe("/ichnara-isr/p/fixture/projects/project");
	await worker.fetch(
		new Request("https://web.test/p/fixture/sitemap.xml"),
		{ PORTFOLIO_CACHE_ENABLED: "true" },
		context,
	);
	expect(paths.at(-1)).toBe("/p/fixture/sitemap.xml");
});

test("internal delivery awaits failing Next completion tasks rather than acknowledging a 204 early", async () => {
	const response = await internalRevalidation(
		{
			async fetch(_request, _env, context) {
				context.waitUntil(Promise.reject(new Error("SYNTHETIC_TAG_WRITE_FAILURE")));
				return new Response(null, { status: 204 });
			},
		},
		new Request("https://internal.test"),
		{},
	);
	expect(response.status).toBe(503);
});
