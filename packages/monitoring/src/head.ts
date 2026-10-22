import { CloudflareClient, createTransport, withIsolationScope } from "@sentry/cloudflare";
import {
	type MonitoringBindings,
	monitoringEnabled,
	monitoringOptions,
	type WorkerName,
} from "./index";

/** Covers HEAD/OPTIONS, which the SDK's automatic request wrapper deliberately skips. */
export async function captureHeadFailure(
	bindings: MonitoringBindings,
	worker: WorkerName,
	status: number,
	error?: unknown,
) {
	if (!monitoringEnabled(bindings)) return;
	const options = monitoringOptions(bindings, worker);
	return withIsolationScope(async (scope) => {
		const client = new CloudflareClient({
			...options,
			stackParser: () => [],
			transport: (transportOptions) =>
				createTransport(transportOptions, async ({ body }) => {
					const response = await fetch(transportOptions.url, {
						method: "POST",
						body: typeof body === "string" ? body : new Uint8Array(body).buffer,
						redirect: "manual",
						signal: AbortSignal.timeout(2000),
						headers: { "Content-Type": "application/x-sentry-envelope" },
					});
					await response.body?.cancel();
					return {
						statusCode: response.status,
						headers: {
							"x-sentry-rate-limits": response.headers.get("x-sentry-rate-limits"),
							"retry-after": response.headers.get("retry-after"),
						},
					};
				}),
		});
		try {
			scope.setClient(client);
			client.init();
			client.captureEvent(
				{
					type: undefined,
					release: options.release,
					level: "error",
					message: "Server operation failed",
					tags: { worker, kind: error ? "unhandled" : "http_5xx", http_status: String(status) },
				},
				{ originalException: error },
				scope,
			);
			await client.flush(2000);
		} catch {
			// Telemetry must never replace or expose the original application response.
		} finally {
			client.dispose();
		}
	});
}
