import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId } from "../lib/validation";
import type { AuthEnv } from "../middleware/auth";
import { type ContentCollection, contentService } from "../services/contentService";
import { hasPatchFields, revisionMutationSchema, revisionSchema } from "./content-validation";

/** Builds the common revision-aware CRUD protocol for one owned content collection. */
export function createCollectionRoutes(collection: ContentCollection, schema: z.ZodObject) {
	const routes = new Hono<AuthEnv>();
	const create = z
		.object({ revision: revisionSchema, item: z.object(schema.shape).strict() })
		.strict();
	const update = z
		.object({
			revision: revisionSchema,
			item: z
				.object(schema.shape)
				.omit({ id: true })
				.partial()
				.strict()
				.refine(hasPatchFields, "Empty item patch"),
		})
		.strict();
	const reorder = z.object({ revision: revisionSchema, ids: z.array(z.uuid()).max(100) }).strict();

	/** Lists the caller-owned collection with its current optimistic revision. */
	routes.get("/", async (c) =>
		successResponse(
			c,
			await contentService.read(c.get("userId"), entityId(c.req.param("id") ?? ""), collection),
		),
	);

	/** Adds one validated item; final aggregate rules are checked within the transaction. */
	routes.post("/", async (c) => {
		const input = create.parse(await c.req.json());
		return successResponse(
			c,
			await contentService.create(
				c.get("userId"),
				entityId(c.req.param("id") ?? ""),
				input.revision,
				collection,
				input.item as Parameters<typeof contentService.create>[4],
			),
		);
	});

	/** Applies an exact ID permutation without inventing or silently dropping items. */
	routes.post("/reorder", async (c) => {
		const input = reorder.parse(await c.req.json());
		return successResponse(
			c,
			await contentService.reorder(
				c.get("userId"),
				entityId(c.req.param("id") ?? ""),
				input.revision,
				collection,
				input.ids,
			),
		);
	});

	/** Reads one collection item after the service verifies site ownership. */
	routes.get("/:itemId", async (c) =>
		successResponse(
			c,
			await contentService.readItem(
				c.get("userId"),
				entityId(c.req.param("id") ?? ""),
				collection,
				entityId(c.req.param("itemId")),
			),
		),
	);

	/** Updates editable item fields while keeping its identity and computed values protected. */
	routes.patch("/:itemId", async (c) => {
		const input = update.parse(await c.req.json());
		return successResponse(
			c,
			await contentService.update(
				c.get("userId"),
				entityId(c.req.param("id") ?? ""),
				input.revision,
				collection,
				entityId(c.req.param("itemId")),
				input.item,
			),
		);
	});

	/** Removes a draft item using the caller's expected revision; releases stay immutable. */
	routes.delete("/:itemId", async (c) => {
		const input = revisionMutationSchema.parse(await c.req.json());
		return successResponse(
			c,
			await contentService.remove(
				c.get("userId"),
				entityId(c.req.param("id") ?? ""),
				input.revision,
				collection,
				entityId(c.req.param("itemId")),
			),
		);
	});
	return routes;
}
