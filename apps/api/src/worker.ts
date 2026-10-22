import { isIP } from "node:net";
import { deployedVersion, type MonitoringBindings } from "@ichnara/monitoring";
import app from "./app";
import { withRequestDatabase } from "./db";
import type { DatabaseBindings } from "./db/hyperdrive";
import { monitorApi } from "./lib/monitoring";
import { type ImagesBinding, withImagesBinding } from "./lib/storage/worker-images-context";
import {
	cacheInvalidationService,
	type RevalidationBindings,
	revalidationDelivery,
	withRevalidationDelivery,
} from "./services/cache-invalidation";
import { maintenanceService } from "./services/maintenance";

type Bindings = MonitoringBindings &
	DatabaseBindings &
	RevalidationBindings & { IMAGES?: ImagesBinding };

/** Derives the edge client address without trusting application-supplied proxy headers. */
export default monitorApi({
	/** Runs the Hono request inside isolated database and image-binding contexts. */
	fetch(request: Request, bindings: Bindings) {
		const headers = new Headers(request.headers);
		const address = request.headers.get("cf-connecting-ip");
		headers.set("x-folio-client-ip", address && isIP(address) ? address : "unknown");
		const options = {
			timing: bindings.DB_TIMING_LOGS === "true",
			hyperdrive: bindings.HYPERDRIVE,
			requestId: undefined as string | undefined,
		};
		return withRequestDatabase(
			() =>
				withImagesBinding(bindings.IMAGES, async () => {
					const response = await withRevalidationDelivery(revalidationDelivery(bindings), () =>
						app.fetch(new Request(request, { headers })),
					);
					options.requestId = response.headers.get("x-request-id") ?? undefined;
					return response;
				}),
			"request",
			options,
		);
	},

	/** Runs bounded housekeeping from the Cron Trigger in its own database scope. */
	scheduled(
		controller: { cron?: string } | null,
		bindings: Bindings,
		context: { waitUntil(task: Promise<unknown>): void },
	) {
		const databaseOptions = {
			timing: bindings.DB_TIMING_LOGS === "true",
			hyperdrive: bindings.HYPERDRIVE,
		};
		if (controller?.cron === "* * * * *") {
			// Retry only; without a pending signal this never opens a database connection.
			const retry = cacheInvalidationService.retryPending(bindings, (operation) =>
				withRequestDatabase(operation, "scheduled", databaseOptions),
			);
			context.waitUntil(retry);
			return retry.then(() => undefined);
		}
		const task = withRequestDatabase(
			async () => {
				try {
					// Daily backstop: drains any backlog even if its retry signal was never written.
					await cacheInvalidationService.flush(revalidationDelivery(bindings));
					const report = await maintenanceService.run();
					console.info(
						JSON.stringify({
							event: "maintenance_completed",
							environment: "trial",
							release: deployedVersion(bindings),
							...report,
						}),
					);
				} catch (error) {
					console.error(
						JSON.stringify({
							event: "maintenance_failed",
							environment: "trial",
							release: deployedVersion(bindings),
						}),
					);
					throw error;
				}
			},
			"scheduled",
			databaseOptions,
		);
		context.waitUntil(task);
		return task;
	},
});
