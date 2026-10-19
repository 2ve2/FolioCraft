import { z } from "zod";
import { paginationSchema } from "../../lib/validation";

// Query and mutation boundaries shared only by administration routes.
export const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");
export const reasonSchema = z.object({ reason: z.string().trim().min(10).max(500) }).strict();
export const auditQuery = paginationSchema.extend({
	actorId: z.string().trim().min(1).max(128).optional(),
	action: z.string().trim().min(1).max(100).optional(),
	targetType: z.enum(["site", "user", "session", "report", "notice", "audit"]).optional(),
	targetId: z.string().trim().min(1).max(128).optional(),
	status: z.enum(["attempted", "succeeded", "failed"]).optional(),
	requestId: z.string().min(1).max(128).optional(),
	from: z.iso.datetime().optional(),
	to: z.iso.datetime().optional(),
});

export const auditFiltersSchema = auditQuery
	.omit({ limit: true, offset: true })
	.strict()
	.refine((q) => !q.from || !q.to || new Date(q.from).getTime() <= new Date(q.to).getTime(), {
		message: "Invalid time range",
	});
