import { Hono } from "hono";
import { z } from "zod";
import { ApiError, successResponse } from "../lib/response-helpers";
import { MAX_ASSET_BYTES } from "../lib/storage";
import { type AuthEnv, requireAuth } from "../middleware/auth";
import { assetService } from "../services/assetService";

/** Validates an asset identifier before invoking the owned resource operation. */
const uuid = (value: string) => {
	if (!z.uuid().safeParse(value).success) throw new ApiError(404, "NOT_FOUND");
	return value;
};
const intent = z.object({
	mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
	size: z.number().int().min(1).max(MAX_ASSET_BYTES),
});
export const assetRoutes = new Hono<AuthEnv>();
assetRoutes.use("/:siteId/assets/*", requireAuth);
assetRoutes.use("/:siteId/assets", requireAuth);
/** Reads validated resource data through the appropriate access guard. */
assetRoutes.get("/:siteId/assets", async (c) =>
	successResponse(c, await assetService.list(c.get("userId"), uuid(c.req.param("siteId")))),
);
/** Validates the operation and delegates its state change to the service. */
assetRoutes.post("/:siteId/assets/upload-intent", async (c) => {
	const data = intent.parse(await c.req.json());
	return successResponse(
		c,
		await assetService.intent(c.get("userId"), uuid(c.req.param("siteId")), data.mime, data.size),
	);
});
/** Validates the operation and delegates its state change to the service. */
assetRoutes.post("/:siteId/assets/cleanup", async (c) =>
	successResponse(c, await assetService.cleanup(c.get("userId"), uuid(c.req.param("siteId")))),
);
/** Validates the operation and delegates its state change to the service. */
assetRoutes.post("/:siteId/assets/:assetId/complete", async (c) =>
	successResponse(
		c,
		await assetService.complete(
			c.get("userId"),
			uuid(c.req.param("siteId")),
			uuid(c.req.param("assetId")),
		),
	),
);
/** Reads validated resource data through the appropriate access guard. */
assetRoutes.get("/:siteId/assets/:assetId/download", async (c) =>
	successResponse(
		c,
		await assetService.download(
			c.get("userId"),
			uuid(c.req.param("siteId")),
			uuid(c.req.param("assetId")),
		),
	),
);
/** Validates identifiers and delegates the guarded resource removal. */
assetRoutes.delete("/:siteId/assets/:assetId", async (c) =>
	successResponse(
		c,
		await assetService.delete(
			c.get("userId"),
			uuid(c.req.param("siteId")),
			uuid(c.req.param("assetId")),
		),
	),
);
