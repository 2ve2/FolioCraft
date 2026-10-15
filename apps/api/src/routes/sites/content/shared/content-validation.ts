import { z } from "zod";

export const revisionSchema = z.number().int().min(0);
export const revisionMutationSchema = z.object({ revision: revisionSchema }).strict();

/** Rejects empty patches so successful writes always express an intentional change. */
export function hasPatchFields(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}
