import { z } from "zod";
export const noticeInput = z
	.object({
		kind: z.enum(["info", "maintenance", "incident"]),
		messageAr: z.string().trim().min(1).max(1000),
		messageEn: z.string().trim().min(1).max(1000),
		startsAt: z.iso.datetime(),
		endsAt: z.iso.datetime(),
		active: z.boolean(),
	})
	.strict()
	.refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
		path: ["endsAt"],
		message: "End must follow start",
	});
export type SystemNotice = z.infer<typeof noticeInput> & {
	id: string;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
};
export type PublicNotice = Pick<
	SystemNotice,
	"id" | "kind" | "messageAr" | "messageEn" | "startsAt" | "endsAt"
>;
