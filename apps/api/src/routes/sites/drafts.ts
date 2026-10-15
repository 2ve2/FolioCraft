import { createSiteSchema, localeSchema, saveSchema, slugSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { entityId } from "../../lib/validation";
import { type AuthEnv, requireAuth } from "../../middleware/auth";
import { siteDraftService } from "../../services/sites/draft-service";

export const privateSites = new Hono<AuthEnv>();
privateSites.use("*", requireAuth);

/** Finds the authenticated account's site without exposing another owner. */
privateSites.get("/", async (c) =>
	successResponse(c, await siteDraftService.list(c.get("userId"))),
);

/** Creates a portfolio with the validated address and chosen content language. */
privateSites.post("/", async (c) => {
	const data = createSiteSchema.parse(await c.req.json());
	return successResponse(c, await siteDraftService.create(c.get("userId"), data.slug, data.locale));
});

/** Reads site metadata and draft data only for its owner. */
privateSites.get("/:id", async (c) =>
	successResponse(c, await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id")))),
);

/** Reads the private preview snapshot through the same ownership guard. */
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

/** Updates the owned address or content language at the expected revision. */
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

/** Saves the complete owned draft through revision and image-reference validation. */
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
