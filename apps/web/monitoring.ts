import { type MonitoringBindings, monitoringEnabled, monitoringOptions } from "@ichnara/monitoring";
import { captureHeadFailure } from "@ichnara/monitoring/head";
import { captureMessage, lastEventId, withSentry } from "@sentry/nextjs/cloudflare";

type Context = { waitUntil(task: Promise<unknown>): void };
type Handler = {
	fetch(request: Request, bindings: MonitoringBindings, context: Context): Promise<Response>;
};

/** Uses the official Next.js Cloudflare boundary and avoids duplicating a Next-captured failure. */
export function monitorWeb(handler: Handler) {
	const monitored = withSentry(
		(bindings: MonitoringBindings) => monitoringOptions(bindings, "web"),
		{
			async fetch(request: Request, bindings: MonitoringBindings, context: Context) {
				const previousEvent = lastEventId();
				const response = await handler.fetch(request, bindings, context);
				if (response.status >= 500 && lastEventId() === previousEvent)
					captureMessage("Server operation failed", {
						level: "error",
						tags: { kind: "http_5xx", http_status: String(response.status) },
					});
				return response;
			},
		},
	);
	return {
		async fetch(request: Request, bindings: MonitoringBindings, context: Context) {
			if (monitoringEnabled(bindings) && ["HEAD", "OPTIONS"].includes(request.method)) {
				try {
					const response = await handler.fetch(request, bindings, context);
					if (response.status >= 500)
						context.waitUntil(captureHeadFailure(bindings, "web", response.status));
					return response;
				} catch (error) {
					context.waitUntil(captureHeadFailure(bindings, "web", 500, error));
					throw error;
				}
			}
			return (monitoringEnabled(bindings) ? monitored : handler).fetch(request, bindings, context);
		},
	};
}
