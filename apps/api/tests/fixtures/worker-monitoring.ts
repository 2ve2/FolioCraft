import type { MonitoringBindings } from "@ichnara/monitoring";
import { setContext, setExtra, setUser } from "@sentry/cloudflare";
import { monitorApi } from "../../src/lib/monitoring";
import production from "../../src/worker";

type Context = { waitUntil(task: Promise<unknown>): void };
const privateText =
	"PRIVATE_DRAFT private@example.invalid 203.0.113.77 2001:db8::1234 private-reset-token";

const monitored = monitorApi({
	async fetch(request: Request) {
		setUser({ email: "private@example.invalid", ip_address: "203.0.113.77" });
		setExtra("draft", privateText);
		setContext("futureSdkField", { body: privateText });
		const path = new URL(request.url).pathname;
		if (path === "/throw") throw new Error(privateText);
		if (path === "/throw-403") throw Object.assign(new Error(privateText), { status: 403 });
		const status = Number(path.slice(1)) || 200;
		return new Response("fixture", { status });
	},
	async scheduled(controller: unknown) {
		if ((controller as { fail?: boolean }).fail) throw new Error(privateText);
		console.info(JSON.stringify({ event: "maintenance_completed" }));
	},
});

/** Test-only faults; no diagnostic endpoint is added to either deployed application. */
export default {
	async fetch(request: Request, bindings: MonitoringBindings, context: Context) {
		const path = new URL(request.url).pathname;
		const pending: Promise<unknown>[] = [];
		const tracked = {
			waitUntil(task: Promise<unknown>) {
				pending.push(task);
				context.waitUntil(task);
			},
		};
		const execute = async () => {
			try {
				if (path === "/health") return await production.fetch(request, bindings, tracked);
				if (path.startsWith("/cron-")) {
					await monitored.scheduled(
						{ cron: "17 3 * * *", scheduledTime: Date.now(), fail: path === "/cron-fail" },
						bindings,
						tracked,
					);
					return new Response("ok");
				}
				return await monitored.fetch(request, bindings, tracked);
			} catch {
				return new Response("fixture error", { status: 500 });
			}
		};
		const response = await execute();
		const body = await response.arrayBuffer();
		for (let index = 0; index < pending.length; index++) await pending[index]?.catch(() => {});
		return new Response(body, response);
	},
};
