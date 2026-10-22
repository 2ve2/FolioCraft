import type { MonitoringBindings } from "@ichnara/monitoring";
import { setExtra, setUser } from "@sentry/nextjs/cloudflare";
import { monitorWeb } from "../../monitoring";
import { onRequestError } from "../../src/instrumentation";

const privateText =
	"PRIVATE_DRAFT private@example.invalid 203.0.113.77 2001:db8::1234 private-reset-token";
const monitored = monitorWeb({
	async fetch(request: Request) {
		setUser({ email: "private@example.invalid", ip_address: "203.0.113.77" });
		setExtra("draft", privateText);
		const path = new URL(request.url).pathname;
		if (path === "/throw") throw new Error(privateText);
		if (path === "/throw-403") throw Object.assign(new Error(privateText), { status: 403 });
		if (path === "/next-error") {
			await onRequestError(
				new Error(privateText),
				{ path: request.url, method: request.method, headers: Object.fromEntries(request.headers) },
				{
					routerKind: "App Router",
					routePath: "/p/[slug]",
					routeType: "render",
					renderSource: "react-server-components",
					revalidateReason: undefined,
				},
			);
			return new Response("next error", { status: 500 });
		}
		return new Response("fixture", { status: Number(path.slice(1)) || 200 });
	},
});

/** Runs the real Next instrumentation hook inside its supported Worker request boundary. */
export default {
	async fetch(
		request: Request,
		bindings: MonitoringBindings,
		context: { waitUntil(task: Promise<unknown>): void },
	) {
		const pending: Promise<unknown>[] = [];
		const tracked = {
			waitUntil(task: Promise<unknown>) {
				pending.push(task);
				context.waitUntil(task);
			},
		};
		const execute = async () => {
			try {
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
