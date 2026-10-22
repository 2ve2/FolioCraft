import { WorkerEntrypoint } from "cloudflare:workers";
import { REVALIDATION_PATH } from "@ichnara/contracts/public-cache";
import handler from "./.open-next/worker.js";
import { monitorWeb } from "./monitoring";
import { internalRevalidation, type PortfolioBindings, portfolioWorker } from "./portfolio-worker";

// Preserve OpenNext's generated Durable Object exports.
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

/** Keeps the generated OpenNext handler untouched when the secret is absent. */
export default monitorWeb(portfolioWorker(handler));

/** Exposed exclusively by a named Service Binding, never by the public default entrypoint. */
export class PortfolioRevalidation extends WorkerEntrypoint<PortfolioBindings> {
	fetch(request: Request) {
		if (!this.env.NEXT_TAG_CACHE_DO_SHARDED) return new Response(null, { status: 503 });
		if (new URL(request.url).pathname !== REVALIDATION_PATH)
			return new Response(null, { status: 404 });
		return internalRevalidation(handler, request, this.env);
	}
}
