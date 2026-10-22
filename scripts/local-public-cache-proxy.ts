import { portfolioWorker } from "../apps/web/portfolio-worker";

// Local E2E boundary uses the production on/off/rewrite/fallback policy with the real Next server.
const worker = portfolioWorker({
	async fetch(request) {
		const target = new URL(request.url);
		target.host = "127.0.0.1:4301";
		const headers = new Headers(request.headers);
		// Bun fetch decodes upstream compression; request identity to preserve response byte/header parity.
		headers.set("accept-encoding", "identity");
		return fetch(new Request(new Request(target, request), { headers }), { redirect: "manual" });
	},
});
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 4300,
	fetch: (request) =>
		worker.fetch(
			request,
			{
				PORTFOLIO_CACHE_ENABLED: "true",
				NEXT_INC_CACHE_R2_BUCKET: true,
				NEXT_TAG_CACHE_DO_SHARDED: true,
			},
			{ waitUntil() {} },
		),
});
process.on("SIGTERM", () => {
	server.stop(true);
	process.exit(0);
});
