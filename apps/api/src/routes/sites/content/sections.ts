import { sectionVisibilitySchema } from "@ichnara/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../../lib/response-helpers";
import { entityId } from "../../../lib/validation";
import type { AuthEnv } from "../../../middleware/auth";
import { contentService } from "../../../services/sites/content-service";
import { siteDraftService } from "../../../services/sites/draft-service";
import { hasPatchFields, revisionSchema } from "./shared/content-validation";

export const sectionRoutes = new Hono<AuthEnv>();
const patchSchema = z
	.object({
		revision: revisionSchema,
		sections: sectionVisibilitySchema.refine(hasPatchFields, "Empty sections patch"),
	})
	.strict();

/** Reads effective visibility, including the legacy projectsVisible setting. */
sectionRoutes.get("/", async (c) => {
	const site = await siteDraftService.preview(c.get("userId"), entityId(c.req.param("id") ?? ""));
	return successResponse(c, {
		revision: site.revision,
		sections: {
			...site.draft.sectionVisibility,
			projects: site.draft.sectionVisibility?.projects ?? site.draft.appearance.projectsVisible,
		},
	});
});

/** Updates section visibility with a revision check and preserves every content item. */
sectionRoutes.patch("/", async (c) => {
	const input = patchSchema.parse(await c.req.json());
	return successResponse(
		c,
		await contentService.sections(
			c.get("userId"),
			entityId(c.req.param("id") ?? ""),
			input.revision,
			input.sections,
		),
	);
});
