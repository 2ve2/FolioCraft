import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { MAX_ASSET_BYTES } from "../../lib/storage";
import { entityId as id } from "../../lib/validation";
import { type AuthEnv, requireAuth } from "../../middleware/auth";
import { assetService } from "../../services/assets";

const intent = z.object({
	mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
	size: z.number().int().min(1).max(MAX_ASSET_BYTES),
});
export const assetRoutes = new Hono<AuthEnv>();
assetRoutes.use("/:siteId/assets/*", requireAuth);
assetRoutes.use("/:siteId/assets", requireAuth);

/** Lists only image metadata belonging to the authenticated site owner. */
assetRoutes.get("/:siteId/assets", async (c) =>
	successResponse(c, await assetService.list(c.get("userId"), id(c.req.param("siteId")))),
);

/** Creates a bounded upload intent and owner-scoped staging record. */
assetRoutes.post("/:siteId/assets/upload-intent", async (c) => {
	const data = intent.parse(await c.req.json());
	return successResponse(
		c,
		await assetService.intent(c.get("userId"), id(c.req.param("siteId")), data.mime, data.size),
	);
});

/** Retries expired upload cleanup without deleting referenced release images. */
assetRoutes.post("/:siteId/assets/cleanup", async (c) =>
	successResponse(c, await assetService.cleanup(c.get("userId"), id(c.req.param("siteId")))),
);

/** Verifies uploaded bytes before an owned image becomes attachable. */
assetRoutes.post("/:siteId/assets/:assetId/complete", async (c) =>
	successResponse(
		c,
		await assetService.complete(
			c.get("userId"),
			id(c.req.param("siteId")),
			id(c.req.param("assetId")),
		),
	),
);

/** Issues a short-lived download permission for an owned ready image. */
assetRoutes.get("/:siteId/assets/:assetId/download", async (c) =>
	successResponse(
		c,
		await assetService.download(
			c.get("userId"),
			id(c.req.param("siteId")),
			id(c.req.param("assetId")),
		),
	),
);

/** Deletes an original only after draft and retained-release reference checks. */
assetRoutes.delete("/:siteId/assets/:assetId", async (c) =>
	successResponse(
		c,
		await assetService.delete(
			c.get("userId"),
			id(c.req.param("siteId")),
			id(c.req.param("assetId")),
		),
	),
);
