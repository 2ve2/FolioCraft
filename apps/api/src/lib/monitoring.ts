import { type MonitoringBindings, monitoringEnabled, monitoringOptions } from "@ichnara/monitoring";
import { captureHeadFailure } from "@ichnara/monitoring/head";
import { captureException, captureMessage, withSentry } from "@sentry/cloudflare";

type Context = { waitUntil(task: Promise<unknown>): void };
type Handler<Bindings extends MonitoringBindings> = {
	fetch(request: Request, bindings: Bindings, context: Context): Promise<Response>;
	scheduled(controller: unknown, bindings: Bindings, context: Context): void | Promise<void>;
};

/** Captures handled server failures as well as exceptions crossing the Workers boundary. */
export function monitorApi<Bindings extends MonitoringBindings>(handler: Handler<Bindings>) {
	const monitored = withSentry((bindings: Bindings) => monitoringOptions(bindings, "api"), {
		async fetch(request: Request, bindings: Bindings, context: Context) {
			const response = await handler.fetch(request, bindings, context);
			if (response.status >= 500)
				captureMessage("Server operation failed", {
					level: "error",
					tags: { kind: "http_5xx", http_status: String(response.status) },
				});
			return response;
		},
		async scheduled(controller: unknown, bindings: Bindings, context: Context) {
			try {
				await handler.scheduled(controller, bindings, context);
			} catch (error) {
				captureException(error, { tags: { kind: "cron_failed" } });
				throw error;
			}
		},
	});
	return {
		async fetch(request: Request, bindings: Bindings, context: Context = { waitUntil() {} }) {
			if (monitoringEnabled(bindings) && ["HEAD", "OPTIONS"].includes(request.method)) {
				try {
					const response = await handler.fetch(request, bindings, context);
					if (response.status >= 500)
						context.waitUntil(captureHeadFailure(bindings, "api", response.status));
					return response;
				} catch (error) {
					context.waitUntil(captureHeadFailure(bindings, "api", 500, error));
					throw error;
				}
			}
			return (monitoringEnabled(bindings) ? monitored : handler).fetch(request, bindings, context);
		},
		scheduled(controller: unknown, bindings: Bindings, context: Context) {
			return (monitoringEnabled(bindings) ? monitored : handler).scheduled(
				controller,
				bindings,
				context,
			);
		},
	};
}
