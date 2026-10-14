import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../lib/response-helpers";
import { entityId, paginationSchema } from "../lib/validation";
import { type AuthEnv, requireAuth } from "../middleware/auth";
import { inquiryService } from "../services/inquiryService";
export const privateInquiries = new Hono<AuthEnv>();
privateInquiries.use("*", requireAuth);
/** Reads validated resource data through the appropriate access guard. */
privateInquiries.get("/:id/inquiries", async (c) => {
	const query = paginationSchema
		.extend({ status: z.enum(["new", "read", "archived"]).optional() })
		.parse(c.req.query());
	return successResponse(
		c,
		await inquiryService.list(
			c.get("userId"),
			entityId(c.req.param("id")),
			query.limit,
			query.offset,
			query.status,
		),
	);
});
/** Validates a partial update and delegates the owned change to the service. */
privateInquiries.patch("/:id/inquiries/:inquiryId", async (c) => {
	const input = z
		.object({ status: z.enum(["read", "archived"]) })
		.strict()
		.parse(await c.req.json());
	return successResponse(
		c,
		await inquiryService.update(
			c.get("userId"),
			entityId(c.req.param("id")),
			entityId(c.req.param("inquiryId")),
			input.status,
		),
	);
});
