import { createSiteSchema, localeSchema, saveSchema, slugSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId } from "../lib/validation";
import { type AuthEnv, requireAuth } from "../middleware/auth";
import { siteDraftService } from "../services/siteDraftService";
export const privateSites = new Hono<AuthEnv>();
privateSites.use("*", requireAuth);
/** Reads validated resource data through the appropriate access guard. */
privateSites.get("/", async (c) =>
	successResponse(c, await siteDraftService.list(c.get("userId"))),
);
/** Validates the operation and delegates its state change to the service. */
privateSites.post("/", async (c) => {
	const data = createSiteSchema.parse(await c.req.json());
	return successResponse(c, await siteDraftService.create(c.get("userId"), data.slug, data.locale));
});
/** Reads validated resource data through the appropriate access guard. */
privateSites.get("/:id", async (c) =>
	successResponse(c, await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id")))),
);
/** Reads validated resource data through the appropriate access guard. */
privateSites.get("/:id/preview", async (c) =>
	successResponse(c, await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id")))),
);
const settingsSchema = z
	.object({
		revision: z.number().int().min(0),
		slug: slugSchema.optional(),
		locale: localeSchema.optional(),
	})
	.strict()
	.refine((value) => value.slug !== undefined || value.locale !== undefined);
/** Validates a partial update and delegates the owned change to the service. */
privateSites.patch("/:id", async (c) => {
	const data = settingsSchema.parse(await c.req.json());
	return successResponse(
		c,
		await siteDraftService.update(
			c.get("userId"),
			entityId(c.req.param("id")),
			data.revision,
			data,
		),
	);
});
/** Validates and saves the owned resource with its revision guard. */
privateSites.put("/:id/draft", async (c) => {
	const data = saveSchema.parse(await c.req.json());
	return successResponse(
		c,
		await siteDraftService.save(
			c.get("userId"),
			entityId(c.req.param("id")),
			data.revision,
			data.draft,
		),
	);
});
