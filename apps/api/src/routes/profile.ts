import { profileSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId } from "../lib/validation";
import type { AuthEnv } from "../middleware/auth";
import { contentService } from "../services/contentService";
import { siteDraftService } from "../services/siteDraftService";
import { hasPatchFields, revisionSchema } from "./content-validation";

export const profileRoutes = new Hono<AuthEnv>();
const patchSchema = z
	.object({
		revision: revisionSchema,
		profile: profileSchema.partial().strict().refine(hasPatchFields, "Empty profile patch"),
	})
	.strict();

/** Reads profile fields from the authenticated user's private draft. */
profileRoutes.get("/", async (c) => {
	const site = await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id") ?? ""));
	return successResponse(c, { revision: site.revision, profile: site.draft.profile });
});

/** Applies a validated profile patch without changing unrelated draft content. */
profileRoutes.patch("/", async (c) => {
	const input = patchSchema.parse(await c.req.json());
	return successResponse(
		c,
		await contentService.profile(
			c.get("userId"),
			entityId(c.req.param("id") ?? ""),
			input.revision,
			input.profile,
		),
	);
});
