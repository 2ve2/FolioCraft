import { isIP } from "node:net";
import app from "./app";
import { env } from "./config/env";
import { pool } from "./db";

let stopping = false;
const server = Bun.serve({
	hostname: env.HOST,
	port: env.PORT,
	idleTimeout: 30,
	maxRequestBodySize: 1_100_000,

	/** Derives a trusted socket client address and dispatches requests to the application. */
	fetch(request, instance) {
		const peer = instance.requestIP(request)?.address ?? "unknown";
		const headers = new Headers(request.headers);
		// Only an explicitly trusted socket peer may supply a proxy client address.
		const forwarded = request.headers.get("x-real-ip");
		const trusted = env.TRUSTED_PROXY_IPS.split(",")
			.map((ip) => ip.trim())
			.filter(Boolean);
		headers.set(
			"x-folio-client-ip",
			trusted.includes(peer) && forwarded && isIP(forwarded) ? forwarded : peer,
		);
		if (stopping)
			return new Response(JSON.stringify({ status: false, code: "SHUTTING_DOWN" }), {
				status: 503,
				headers: { "content-type": "application/json" },
			});
		return app.fetch(new Request(request, { headers }));
	},
});
console.info(JSON.stringify({ event: "server_started", host: env.HOST, port: env.PORT }));

/** Drains the HTTP server and PostgreSQL pool with a bounded forced shutdown. */
const shutdown = async () => {
	if (stopping) return;
	stopping = true;
	const timeout = setTimeout(() => {
		server.stop(true);
		process.exit(1);
	}, 15000);
	timeout.unref();
	try {
		await server.stop();
		await pool.end();
		clearTimeout(timeout);
		process.exit(0);
	} catch {
		process.exit(1);
	}
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
