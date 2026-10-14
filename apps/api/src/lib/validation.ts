import { z } from "zod";
import { ApiError } from "./response-helpers";
/** Validates a resource UUID and hides invalid identifiers behind the not-found contract. */
export const entityId = (value: string) => {
	const parsed = z.uuid().safeParse(value);
	if (!parsed.success) throw new ApiError(404, "NOT_FOUND");
	return parsed.data;
};
export const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).max(10000).default(0),
});
