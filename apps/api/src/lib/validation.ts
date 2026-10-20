import { idSchema } from "@ichnara/contracts";
import { z } from "zod";
import { ApiError } from "./response-helpers";

/** Validates a resource identifier (cuid2 or legacy UUID) and hides invalid ones behind not-found. */
export const entityId = (value: string) => {
	const parsed = idSchema.safeParse(value);
	if (!parsed.success) throw new ApiError(404, "NOT_FOUND");
	return parsed.data;
};

export const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).max(10000).default(0),
});
