import { z } from "zod";
import { paginationSchema } from "../../lib/validation";

// Query and mutation boundaries shared only by administration routes.
export const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");
export const reasonSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
export const auditQuery = paginationSchema.extend({
	actorId: z.string().trim().min(1).max(128).optional(),
	action: z.string().trim().min(1).max(100).optional(),
	targetType: z.enum(["site", "user", "session"]).optional(),
	targetId: z.string().trim().min(1).max(128).optional(),
	status: z.enum(["attempted", "succeeded", "failed"]).optional(),
});
