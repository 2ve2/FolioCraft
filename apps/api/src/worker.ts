import { isIP } from "node:net";
import { deployedVersion, type MonitoringBindings } from "@ichnara/monitoring";
import app from "./app";
import { withRequestDatabase } from "./db";
import { monitorApi } from "./lib/monitoring";
import { type ImagesBinding, withImagesBinding } from "./lib/storage/worker-images-context";
import { maintenanceService } from "./services/maintenance";

type Bindings = MonitoringBindings & { IMAGES?: ImagesBinding };

/** Derives the edge client address without trusting application-supplied proxy headers. */
export default monitorApi({
	/** Runs the Hono request inside isolated database and image-binding contexts. */
	fetch(request: Request, bindings: Bindings) {
		const headers = new Headers(request.headers);
		const address = request.headers.get("cf-connecting-ip");
		headers.set("x-folio-client-ip", address && isIP(address) ? address : "unknown");
		return withRequestDatabase(() =>
			withImagesBinding(bindings.IMAGES, async () => app.fetch(new Request(request, { headers }))),
		);
	},

	/** Runs bounded housekeeping from the Cron Trigger in its own database scope. */
	scheduled(
		_controller: unknown,
		bindings: Bindings,
		context: { waitUntil(task: Promise<unknown>): void },
	) {
		const task = withRequestDatabase(async () => {
			try {
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
		}, "scheduled");
		context.waitUntil(task);
		return task;
	},
});
