import { z } from "zod";

export const reportCategories = [
	"spam",
	"impersonation",
	"illegal",
	"harassment",
	"copyright",
	"other",
] as const;
export const reportStatuses = ["open", "reviewing", "actioned", "dismissed"] as const;
export const reportInput = z
	.object({
		category: z.enum(reportCategories),
		message: z.string().trim().min(10).max(1000),
		reporterEmail: z.email().max(254).optional(),
	})
	.strict();
export const reportStatusInput = z
	.object({
		status: z.enum(["reviewing", "dismissed", "actioned"]),
		resolutionNote: z.string().trim().min(10).max(500).optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.status !== "reviewing" && !value.resolutionNote)
			ctx.addIssue({
				code: "custom",
				path: ["resolutionNote"],
				message: "Closure requires a resolution note",
			});
	});
export type ContentReport = {
	id: string;
	siteId: string;
	slug: string;
	category: (typeof reportCategories)[number];
	message: string;
	reporterEmail: string | null;
	status: (typeof reportStatuses)[number];
	handledBy: string | null;
	handledAt: string | null;
	resolutionNote: string | null;
	createdAt: string;
};
export type ReportPage = { items: ContentReport[]; nextCursor: string | null };
