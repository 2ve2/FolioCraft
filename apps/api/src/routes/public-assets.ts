import { slugSchema } from "@folio/contracts";
import { Hono } from "hono";
import { ApiError } from "../lib/response-helpers";
import { entityId as uuid } from "../lib/validation";
import { assetService } from "../services/assetService";

export const publicAssetRoutes = new Hono();
/** Reads validated resource data through the appropriate access guard. */
publicAssetRoutes.get("/:slug/assets/:assetId", async (c) => {
	const slug = slugSchema.safeParse(c.req.param("slug"));
	if (!slug.success) throw new ApiError(404, "NOT_FOUND");
	c.header("Cache-Control", "no-store");
	c.header("Referrer-Policy", "no-referrer");
	return c.redirect(await assetService.publicUrl(slug.data, uuid(c.req.param("assetId"))), 302);
});
