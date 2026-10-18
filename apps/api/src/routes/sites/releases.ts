import { publishSchema } from "@ichnara/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { entityId, paginationSchema } from "../../lib/validation";
import type { AuthEnv } from "../../middleware/auth";
import { releaseService } from "../../services/sites/release-service";

export const releaseRoutes = new Hono<AuthEnv>();

/** Publishes a validated owned draft as an atomic release snapshot. */
releaseRoutes.post("/:id/releases", async (c) => {
	const data = publishSchema.parse(await c.req.json());
	return successResponse(
		c,
		await releaseService.publish(c.get("userId"), entityId(c.req.param("id")), data.revision),
	);
});

/** Lists the owned site's retained releases using bounded pagination. */
releaseRoutes.get("/:id/releases", async (c) => {
	const query = paginationSchema.parse(c.req.query());
	return successResponse(
		c,
		await releaseService.history(
			c.get("userId"),
			entityId(c.req.param("id")),
			query.limit,
			query.offset,
		),
	);
});

/** Reads one retained release only within the caller's owned site. */
releaseRoutes.get("/:id/releases/:releaseId", async (c) =>
	successResponse(
		c,
		await releaseService.release(
			c.get("userId"),
			entityId(c.req.param("id")),
			entityId(c.req.param("releaseId")),
		),
	),
);

/** Activates a retained release only if the expected public pointer still matches. */
releaseRoutes.post("/:id/releases/:releaseId/activate", async (c) => {
	const data = z
		.object({ expectedReleaseId: z.uuid().nullable() })
		.strict()
		.parse(await c.req.json());
	return successResponse(
		c,
		await releaseService.activate(
			c.get("userId"),
			entityId(c.req.param("id")),
			entityId(c.req.param("releaseId")),
			data.expectedReleaseId,
		),
	);
});

/** Removes public availability while retaining the owned draft and release history. */
releaseRoutes.post("/:id/unpublish", async (c) =>
	successResponse(c, await releaseService.unpublish(c.get("userId"), entityId(c.req.param("id")))),
);
