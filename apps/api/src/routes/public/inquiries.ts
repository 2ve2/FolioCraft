import { slugSchema } from "@folio/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError, successResponse } from "../../lib/response-helpers";
import { inquiryService } from "../../services/inquiries";
import { rateLimitService } from "../../services/rate-limit";

export const publicInquiries = new Hono();
const inquiryInput = z
	.object({
		name: z.string().trim().min(1).max(100),
		email: z.email().max(254),
		message: z.string().trim().min(10).max(3000),
		website: z.literal("").optional(),
	})
	.strict();

/** Validates the operation and delegates its state change to the service. */
publicInquiries.post("/:slug/inquiries", async (c) => {
	const slug = slugSchema.parse(c.req.param("slug"));
	const data = inquiryInput.parse(await c.req.json());
	const ip = c.req.header("x-folio-client-ip") ?? "unknown";
	for (const [key, max, window] of [
		[`inquiry:${slug}:${ip}`, 5, 60],
		[`inquiry:site:${slug}`, 60, 3600],
	] as const) {
		const limit = await rateLimitService.consume(key, max, window);
		if (!limit.allowed) {
			c.header("Retry-After", String(limit.retryAfter));
			throw new ApiError(429, "RATE_LIMITED");
		}
	}
	const result = await inquiryService.create(slug, {
		name: data.name,
		email: data.email,
		message: data.message,
	});
	return successResponse(c, result, undefined, 201);
});
