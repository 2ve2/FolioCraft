import { publishSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId, paginationSchema } from "../lib/validation";
import type { AuthEnv } from "../middleware/auth";
import { releaseService } from "../services/releaseService";

export const releaseRoutes = new Hono<AuthEnv>();

/** Validates the operation and delegates its state change to the service. */
releaseRoutes.post("/:id/releases", async (c) => {
	const data = publishSchema.parse(await c.req.json());
	return successResponse(
		c,
		await releaseService.publish(c.get("userId"), entityId(c.req.param("id")), data.revision),
	);
});
/** Reads validated resource data through the appropriate access guard. */
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
/** Reads validated resource data through the appropriate access guard. */
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
/** Validates the operation and delegates its state change to the service. */
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
/** Validates the operation and delegates its state change to the service. */
releaseRoutes.post("/:id/unpublish", async (c) =>
	successResponse(c, await releaseService.unpublish(c.get("userId"), entityId(c.req.param("id")))),
);
