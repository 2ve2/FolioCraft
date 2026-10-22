import "../test-guard";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { newId, type Site } from "@ichnara/contracts";
import { REVALIDATION_PATH } from "@ichnara/contracts/public-cache";
import { eq } from "drizzle-orm";
import app from "../../src/app";
import { env } from "../../src/config/env";
import { db, pool } from "../../src/db";
import { user } from "../../src/db/schema/auth";
import { cacheInvalidations } from "../../src/db/schema/cache";
import {
	cacheInvalidationService,
	PENDING_SIGNAL_KEY,
	revalidationDelivery,
	withRevalidationDelivery,
} from "../../src/services/cache-invalidation";

const root = new URL("../../../../", import.meta.url);
const output = new URL("work/published-isr/runtime/", root);
const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = require("miniflare");
const secret = "synthetic-local-cache-runtime-at-least-32-characters";
const slug = `runtime-${newId()}`;
let ownerId: string | undefined;
let siteId: string | undefined;
let cookie = "";
let apiReads = 0;
let passed = 0;
let heldRead: { arrived: () => void; release: Promise<void> } | undefined;
let miniflare: InstanceType<typeof Miniflare> | undefined;
const report: Record<string, unknown> = {};

/** Native auth/domain requests stay in memory; no credentials or session responses are printed. */
async function domain<T>(path: string, method = "GET", body?: unknown): Promise<T> {
	const response = await app.request(`${env.API_URL}${path}`, {
		method,
		headers: {
			origin: env.WEB_URL,
			cookie,
			"content-type": "application/json",
			"x-folio-client-ip": "127.23.44.51",
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	assert.equal(response.status, 200, `Domain request ${method} ${path}`);
	return (await response.json()).result;
}

try {
	const signup = await app.request(`${env.API_URL}/api/auth/sign-up/email`, {
		method: "POST",
		headers: {
			origin: env.WEB_URL,
			"content-type": "application/json",
			"x-folio-client-ip": "127.23.44.51",
		},
		body: JSON.stringify({
			name: "Runtime cache fixture",
			email: `${newId()}@example.invalid`,
			password: `Synthetic-${newId()}`,
		}),
	});
	assert.equal(signup.status, 200);
	ownerId = (await signup.json()).user.id;
	cookie = signup.headers
		.getSetCookie()
		.map((value) => value.split(";")[0])
		.join("; ");
	let site = await domain<Site>("/api/sites", "POST", { slug, locale: "ar" });
	siteId = site.id;
	site = await domain<Site>(`/api/sites/${site.id}/draft`, "PUT", {
		revision: site.revision,
		draft: {
			...site.draft,
			profile: { ...site.draft.profile, name: "منشور أول", role: "مصمم" },
			projects: [
				{
					id: newId(),
					slug: "runtime-project",
					title: "مشروع منشور",
					summary: "ملخص",
					body: "تفاصيل",
					role: "مصمم",
					year: "2026",
					tools: "Bun",
					url: "",
				},
			],
			articles: [
				{
					id: newId(),
					slug: "runtime-article",
					title: "مقال منشور",
					summary: "ملخص",
					body: "تفاصيل",
					published: true,
				},
			],
		},
	});
	await domain(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision });
	const bundler = Bun.spawn(
		[
			"bun",
			"--no-env-file",
			"x",
			"--no-install",
			"wrangler",
			"deploy",
			"--dry-run",
			"--outdir",
			fileURLToPath(output),
		],
		{
			cwd: fileURLToPath(new URL("apps/web/", root)),
			env: {
				PATH: process.env.PATH,
				HOME: process.env.HOME,
				WRANGLER_SEND_METRICS: "false",
				WRANGLER_WRITE_LOGS: "false",
				CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
			},
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [stdout, stderr] = await Promise.all([
		new Response(bundler.stdout).text(),
		new Response(bundler.stderr).text(),
	]);
	assert.equal(await bundler.exited, 0, `Local web dry run: ${stdout}\n${stderr}`);
	const common = {
		modules: true,
		modulesRoot: fileURLToPath(output),
		scriptPath: fileURLToPath(new URL("worker.js", output)),
		compatibilityDate: "2026-10-14",
		compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
		assets: {
			directory: fileURLToPath(new URL("apps/web/.open-next/assets/", root)),
			binding: "ASSETS",
			run_worker_first: true,
			routerConfig: { has_user_worker: true },
		},
		logRequests: false,
		outboundService: {
			node: async (request: IncomingMessage, response: ServerResponse) => {
				assert.equal(
					request.headers.host,
					"cache-api.invalid",
					"Unexpected external request blocked",
				);
				apiReads++;
				const result = await app.request(new URL(request.url ?? "/", env.API_URL).href);
				const bytes = Buffer.from(await result.arrayBuffer());
				if (heldRead && request.url?.endsWith("/cache")) {
					const hold = heldRead;
					heldRead = undefined;
					hold.arrived();
					await hold.release;
				}
				response.writeHead(result.status, Object.fromEntries(result.headers));
				response.end(bytes);
			},
		},
	};
	miniflare = new Miniflare(
		convertV4MiniflareOptions({
			unsafeInspectDurableObjects: true,
			workers: [
				{
					...common,
					name: "web",
					bindings: {
						API_URL: "https://cache-api.invalid",
						PORTFOLIO_CACHE_ENABLED: "true",
						PORTFOLIO_REVALIDATION_SECRET: secret,
					},
					r2Buckets: { NEXT_INC_CACHE_R2_BUCKET: "local-portfolio-cache" },
					durableObjects: {
						NEXT_TAG_CACHE_DO_SHARDED: { className: "DOShardedTagCache", useSQLite: true },
					},
				},
				{
					...common,
					name: "web-off",
					unsafeDirectSockets: [{ host: "127.0.0.1", port: 0 }],
					bindings: { API_URL: "https://cache-api.invalid", PORTFOLIO_CACHE_ENABLED: "false" },
				},
				{
					name: "caller",
					compatibilityDate: "2026-10-14",
					modules: true,
					script: `export default { async fetch(request, env) {
 if (new URL(request.url).pathname === "/test-tag-order") {
 const stub = env.TAGS.get(env.TAGS.idFromName("tag-hard;shard-0;replica-1"));
 const tag = "ichnara:portfolio:receipt:order-probe";
 await stub.writeTags([{tag, expire:200, stale:200}]);
 await stub.writeTags([{tag, expire:100, stale:100}]);
 return Response.json(await stub.getTagData([tag]));
 }
 return env.REVALIDATE.fetch(request); } };`,
					serviceBindings: { REVALIDATE: { name: "web", entrypoint: "PortfolioRevalidation" } },
					durableObjects: {
						TAGS: { className: "DOShardedTagCache", scriptName: "web", useSQLite: true },
					},
				},
			],
			log: new Log(LogLevel.ERROR),
		}),
	);
	const origin = await miniflare.ready;
	const caller = await miniflare.getWorker("caller");
	const deliver = revalidationDelivery({
		PORTFOLIO_REVALIDATION_SECRET: secret,
		PORTFOLIO_REVALIDATION: {
			async fetch(request) {
				return caller.fetch(request.url, {
					method: request.method,
					headers: request.headers,
					body: await request.text(),
				});
			},
		},
	});
	/** Makes real HTTP requests to the built OpenNext Worker and consumes the response body. */
	async function view(path = `/p/${slug}`, name?: string) {
		const started = performance.now();
		const response = await fetch(new URL(path, origin), { headers: { "accept-language": "en" } });
		const ttfb = performance.now() - started;
		const html = await response.text();
		if (name) {
			assert.equal(response.status, 200);
			assert.ok(html.includes(name));
		}
		return {
			status: response.status,
			html,
			ttfb,
			cache: response.headers.get("x-nextjs-cache"),
			headers: response.headers,
		};
	}
	const cold = await view(undefined, "منشور أول");
	assert.ok(cold.html.includes('lang="ar"'));
	assert.ok(cold.html.includes('dir="rtl"'));
	assert.ok(cold.headers.get("content-security-policy"));
	passed++;
	const readsAfterCold = apiReads;
	const warm = await view(undefined, "منشور أول");
	assert.equal(apiReads, readsAfterCold, "Warm ISR must not query the API/database");
	assert.equal(warm.cache, "HIT");
	passed++;
	const bucket = await miniflare.getR2Bucket("NEXT_INC_CACHE_R2_BUCKET", "web");
	for (const path of [
		`/p/${slug}/projects/runtime-project`,
		`/p/${slug}/articles/runtime-article`,
	]) {
		assert.equal((await view(path)).status, 200);
		assert.equal((await view(path)).cache, "HIT");
	}
	passed++;
	for (const object of (await bucket.list()).objects) {
		const data = await (await bucket.get(object.key))?.json();
		assert.equal(data.type, "app");
		assert.ok(JSON.stringify(data.meta.headers).includes(`ichnara:portfolio:site:${site.id}`));
		assert.ok(JSON.stringify(data.meta.headers).includes(`ichnara:portfolio:slug:${site.slug}`));
	}
	passed++;
	assert.ok((await bucket.list()).objects.length > 0);
	const beforeMissing = (await bucket.list()).objects.length;
	assert.equal((await view("/p/runtime-missing-one")).status, 404);
	assert.equal((await view("/p/runtime-missing-one")).status, 404);
	assert.equal(
		(await bucket.list()).objects.length,
		beforeMissing,
		"Missing portfolios must never enter R2",
	);
	passed++;
	site = await domain<Site>(`/api/sites/${site.id}/draft`, "PUT", {
		revision: site.revision,
		draft: { ...site.draft, profile: { ...site.draft.profile, name: "منشور ثان" } },
	});
	const old = await view(undefined, "منشور أول");
	assert.ok(!old.html.includes("منشور ثان"));
	for (const object of (await bucket.list()).objects)
		assert.ok(!(await (await bucket.get(object.key))?.text())?.includes("منشور ثان"));
	passed++;
	await withRevalidationDelivery(deliver, () =>
		domain(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision }),
	);
	await view(undefined, "منشور ثان");
	passed++;
	assert.equal(
		(
			await fetch(new URL(REVALIDATION_PATH, origin), {
				method: "POST",
				headers: { authorization: `Bearer ${secret}` },
			})
		).status,
		404,
	);
	assert.equal(
		(
			await caller.fetch(`https://internal.test${REVALIDATION_PATH}`, {
				method: "POST",
				body: JSON.stringify({ siteId: site.id, slug }),
			})
		).status,
		401,
	);
	passed++;
	const beforeOff = apiReads;
	const offOrigin = await miniflare.unsafeGetDirectURL("web-off");
	const uncachedSamples: number[] = [];
	const cachedSamples: number[] = [];
	const offColdStart = performance.now();
	const offCold = await fetch(new URL(`/p/${slug}`, offOrigin));
	report.coldUncachedTtfbMs = Number((performance.now() - offColdStart).toFixed(2));
	assert.equal(offCold.status, 200);
	await offCold.text();
	assert.ok(apiReads > beforeOff);
	passed++;
	for (let index = 0; index < 10; index++) {
		const start = performance.now();
		const response = await fetch(new URL(`/p/${slug}`, offOrigin));
		uncachedSamples.push(performance.now() - start);
		assert.equal(response.status, 200);
		await response.text();
		cachedSamples.push((await view(undefined, "منشور ثان")).ttfb);
	}
	const summarize = (values: number[]) => ({
		count: values.length,
		medianMs: Number([...values].sort((a, b) => a - b)[Math.floor(values.length / 2)].toFixed(2)),
		minMs: Number(Math.min(...values).toFixed(2)),
		maxMs: Number(Math.max(...values).toFixed(2)),
	});
	report.uncached = summarize(uncachedSamples);
	report.cached = summarize(cachedSamples);
	await withRevalidationDelivery(deliver, () => domain(`/api/sites/${site.id}/unpublish`, "POST"));
	assert.equal(
		(await view()).status,
		404,
		"The very next HTTP request after unpublish must be unavailable",
	);
	passed++;
	for (const path of [`/p/${slug}/projects/runtime-project`, `/p/${slug}/articles/runtime-article`])
		assert.equal((await view(path)).status, 404);
	passed++;
	await withRevalidationDelivery(deliver, () =>
		domain(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision }),
	);
	await view(undefined, "منشور ثان");

	const order = await caller.fetch("https://internal.test/test-tag-order");
	assert.equal((await order.json())["ichnara:portfolio:receipt:order-probe"].expire, 200);
	passed++;
	let arrived!: () => void;
	let release!: () => void;
	const waiting = new Promise<void>((resolve) => {
		arrived = resolve;
	});
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	heldRead = { arrived, release: released };
	const detailPath = `/p/${slug}/projects/${site.draft.projects[0].id}`;
	const late = view(detailPath);
	await waiting;
	try {
		site = await domain<Site>(`/api/sites/${site.id}/draft`, "PUT", {
			revision: site.revision,
			draft: {
				...site.draft,
				projects: site.draft.projects.map((project) => ({ ...project, title: "مشروع أحدث" })),
			},
		});
		await withRevalidationDelivery(deliver, () =>
			domain(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision }),
		);
	} finally {
		release();
	}
	await late;
	await view(detailPath, "مشروع أحدث");
	passed++;
	const tagStore = await miniflare.unsafeGetDurableObjectStorage("web", "DOShardedTagCache", {
		name: "tag-hard;shard-0;replica-1",
	});
	await tagStore.exec("ALTER TABLE revalidations RENAME TO revalidations_fault_probe");
	try {
		await withRevalidationDelivery(deliver, () =>
			domain(`/api/sites/${site.id}/unpublish`, "POST"),
		);
		const queued = await db
			.select()
			.from(cacheInvalidations)
			.where(eq(cacheInvalidations.siteId, site.id));
		assert.ok(
			queued.some((row) => row.version > row.deliveredVersion && row.attempts > 0),
			"A failed real SQLite invalidation must not be acknowledged",
		);
		assert.equal(
			(await view()).status,
			404,
			"Failed tag reads must never serve unchecked cached HTML",
		);
		passed++;
	} finally {
		await tagStore.exec("ALTER TABLE revalidations_fault_probe RENAME TO revalidations");
	}
	assert.equal((await cacheInvalidationService.flush(deliver, 20, [site.id])).failed, 0);
	assert.ok(
		(
			await db.select().from(cacheInvalidations).where(eq(cacheInvalidations.siteId, site.id))
		).every((row) => row.version === row.deliveredVersion),
	);
	passed++;
	// The minute retry signal lives in the same real R2 bucket and relies on its etag preconditions.
	const signal = await miniflare.getR2Bucket("NEXT_INC_CACHE_R2_BUCKET", "web");
	const signalBindings = {
		PORTFOLIO_REVALIDATION_SECRET: secret,
		PORTFOLIO_REVALIDATION: { fetch: async () => new Response(null, { status: 204 }) },
		PUBLIC_CACHE_SIGNAL: signal,
	};
	let databaseScopes = 0;
	const countedScope = async <T>(operation: () => Promise<T>) => {
		databaseScopes++;
		return operation();
	};
	assert.deepEqual(await cacheInvalidationService.retryPending(signalBindings, countedScope), {
		skipped: true,
	});
	assert.equal(databaseScopes, 0, "Without a pending signal the minute retry opens no database");
	// Marks carry unique content exactly as the service writes them (R2 etags hash content).
	await signal.put(PENDING_SIGNAL_KEY, newId(), { customMetadata: { state: "pending" } });
	const earlierRead = await signal.head(PENDING_SIGNAL_KEY);
	await signal.put(PENDING_SIGNAL_KEY, newId(), { customMetadata: { state: "pending" } });
	assert.equal(
		await signal.put(PENDING_SIGNAL_KEY, "", {
			customMetadata: { state: "clear" },
			onlyIf: { etagMatches: earlierRead.etag },
		}),
		null,
		"An older read must not clear a signal that was re-marked afterwards",
	);
	let remaining = true;
	for (let round = 0; round < 50 && remaining; round++) {
		const drained = await cacheInvalidationService.retryPending(signalBindings, countedScope);
		remaining = "remaining" in drained && drained.remaining;
	}
	assert.equal(remaining, false);
	assert.equal((await signal.head(PENDING_SIGNAL_KEY))?.customMetadata?.state, "clear");
	passed++;
	report.runtimeChecks = passed;
	report.coldCachedTtfbMs = Number(cold.ttfb.toFixed(2));
	report.warmCachedTtfbMs = Number(warm.ttfb.toFixed(2));
	report.apiReads = apiReads;
	console.log(JSON.stringify({ event: "public_cache_runtime", ...report }));
} finally {
	await miniflare?.dispose();
	if (ownerId) await db.delete(user).where(eq(user.id, ownerId));
	if (siteId) await db.delete(cacheInvalidations).where(eq(cacheInvalidations.siteId, siteId));
	await pool.end();
}
