import { AsyncLocalStorage } from "node:async_hooks";
import {
	invalidationSchema,
	PUBLIC_CACHE_PREFIX,
	portfolioDocument,
	portfolioReceipt,
	portfolioTags,
	REVALIDATION_PATH,
} from "@ichnara/contracts/public-cache";
import type { MonitoringBindings } from "@ichnara/monitoring";
import createTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

type Context = { waitUntil(task: Promise<unknown>): void };
const scopeKey = Symbol.for("ichnara.portfolio.render-start");
const globals = globalThis as unknown as Record<symbol, AsyncLocalStorage<number>>;
if (!globals[scopeKey]) globals[scopeKey] = new AsyncLocalStorage<number>();
const renderScope = globals[scopeKey];

/** Shares request-start provenance with the incremental adapter across generated bundles. */
export function withPortfolioRender<T>(operation: () => T): T {
	return renderScope.run(Date.now(), operation);
}
export type PortfolioBindings = MonitoringBindings & {
	PORTFOLIO_CACHE_ENABLED?: string;
	PORTFOLIO_REVALIDATION_SECRET?: string;
	NEXT_INC_CACHE_R2_BUCKET?: unknown;
	NEXT_TAG_CACHE_DO_SHARDED?: unknown;
};
export type WebHandler = {
	fetch(request: Request, env: PortfolioBindings, context: Context): Promise<Response>;
};

/** Blocks reserved public paths and routes only opted-in portfolio documents into ISR. */
export function portfolioWorker(handler: WebHandler): WebHandler {
	return {
		async fetch(request, env, context) {
			const url = new URL(request.url);
			let pathname: string;
			try {
				pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
			} catch {
				return new Response(null, { status: 400 });
			}
			if (
				pathname === REVALIDATION_PATH ||
				pathname === PUBLIC_CACHE_PREFIX ||
				pathname.startsWith(`${PUBLIC_CACHE_PREFIX}/`)
			) {
				return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
			}
			if (
				env.PORTFOLIO_CACHE_ENABLED !== "true" ||
				!env.NEXT_INC_CACHE_R2_BUCKET ||
				!env.NEXT_TAG_CACHE_DO_SHARDED ||
				!["GET", "HEAD"].includes(request.method) ||
				!portfolioDocument(url.pathname)
			) {
				return handler.fetch(request, env, context);
			}
			url.pathname = `${PUBLIC_CACHE_PREFIX}${url.pathname}`;
			const response = await withPortfolioRender(() =>
				handler.fetch(new Request(url, request), env, context),
			);
			if (response.status !== 200 || response.headers.has("set-cookie")) {
				await response.body?.cancel();
				return handler.fetch(request, env, context);
			}
			const headers = new Headers(response.headers);
			// Invalidation controls server storage; a browser or CDN must never keep revoked HTML.
			headers.set("cache-control", "private, no-store");
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		},
	};
}

/** Awaits Next's revalidation completion tasks before acknowledging the durable API intent. */
export async function internalRevalidation(
	handler: WebHandler,
	request: Request,
	env: PortfolioBindings,
) {
	const pending: Promise<unknown>[] = [];
	try {
		const message = await request
			.clone()
			.json()
			.catch(() => null);
		const response = await handler.fetch(request, env, {
			waitUntil: (task) => {
				pending.push(task);
			},
		});
		await Promise.all(pending);
		if (response.status === 204) {
			const input = invalidationSchema.parse(message);
			const tags = [...portfolioTags(input.siteId, input.slug), portfolioReceipt(input.deliveryId)];
			const namespace = env.NEXT_TAG_CACHE_DO_SHARDED as {
				idFromName(name: string): unknown;
				get(id: unknown): {
					getTagData(tags: string[]): Promise<Record<string, { expire?: number | null }>>;
				};
			};
			for (const { doId, tags: group } of createTagCache({
				baseShardSize: 1,
				regionalCache: false,
			}).groupTagsByDO({ tags })) {
				const data = await namespace.get(namespace.idFromName(doId.key)).getTagData(group);
				if (group.some((tag) => data[tag]?.expire == null))
					throw new Error("CACHE_RECEIPT_MISSING");
			}
		}
		return response;
	} catch {
		return new Response(null, { status: 503, headers: { "cache-control": "no-store" } });
	}
}
