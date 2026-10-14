import { appearanceSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId } from "../lib/validation";
import type { AuthEnv } from "../middleware/auth";
import { contentService } from "../services/contentService";
import { siteDraftService } from "../services/siteDraftService";
import { hasPatchFields, revisionSchema } from "./content-validation";

export const appearanceRoutes = new Hono<AuthEnv>();
const patchSchema = z
	.object({
		revision: revisionSchema,
		appearance: appearanceSchema
			.partial()
			.strict()
			.refine(hasPatchFields, "Empty appearance patch"),
	})
	.strict();

/** Reads appearance settings independently of profile and project content. */
appearanceRoutes.get("/", async (c) => {
	const site = await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id") ?? ""));
	return successResponse(c, { revision: site.revision, appearance: site.draft.appearance });
});

/** Changes appearance tokens and synchronizes visibility without replacing user content. */
appearanceRoutes.patch("/", async (c) => {
	const input = patchSchema.parse(await c.req.json());
	return successResponse(
		c,
		await contentService.appearance(
			c.get("userId"),
			entityId(c.req.param("id") ?? ""),
			input.revision,
			input.appearance,
		),
	);
});
