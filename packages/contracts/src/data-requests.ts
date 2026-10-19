import { z } from "zod";
export const dataRequestTypes = ["export", "delete", "correction"] as const;
export const dataRequestStatuses = ["received", "in_progress", "completed", "rejected"] as const;
export const dataRequestInput = z
	.object({
		email: z.email().max(254),
		type: z.enum(dataRequestTypes),
	})
	.strict();
export const dataRequestTransitions = {
	received: ["in_progress", "rejected"],
	in_progress: ["completed", "rejected"],
	completed: [],
	rejected: [],
} as const;
export type DataRequest = {
	id: string;
	userId: string | null;
	email: string;
	type: (typeof dataRequestTypes)[number];
	status: (typeof dataRequestStatuses)[number];
	dueAt: string;
	handledBy: string | null;
	notes: string | null;
	createdAt: string;
	completedAt: string | null;
	subjectVerifiedAt: string | null;
	subjectVerifiedBy: string | null;
};
