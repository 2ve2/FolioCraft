import { newId, type noticeInput } from "@ichnara/contracts";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db";
import { systemNotices as notices } from "../../db/schema/notices";
import { auth } from "../../lib/auth";
import { ApiError } from "../../lib/response-helpers";
import { recordAdminAction } from "./audit-service";
import { appendSensitiveOutcome, prepareSensitiveAction } from "./sensitive-action";
export const noticeService = {
	async list(limit: number, offset: number) {
		const rows = await db
			.select()
			.from(notices)
			.orderBy(desc(notices.createdAt), desc(notices.id))
			.limit(limit + 1)
			.offset(offset);
		return { items: rows.slice(0, limit), hasMore: rows.length > limit, limit, offset };
	},
	/** Uses the database clock, inclusive start/exclusive end, with no creator or internal timestamps. */
	async public() {
		return {
			items: await db
				.select({
					id: notices.id,
					kind: notices.kind,
					messageAr: notices.messageAr,
					messageEn: notices.messageEn,
					startsAt: notices.startsAt,
					endsAt: notices.endsAt,
				})
				.from(notices)
				.where(
					and(
						eq(notices.active, true),
						lte(notices.startsAt, sql`current_timestamp`),
						gt(notices.endsAt, sql`current_timestamp`),
					),
				)
				.orderBy(asc(notices.startsAt), asc(notices.id)),
		};
	},
	/** Commits the notice and separate success row atomically after a durable, password-checked attempt. */
	async change(
		headers: Headers,
		credentials: unknown,
		input: z.infer<typeof noticeInput> | null,
		id: string = newId(),
		create = false,
	) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const { audit } = await prepareSensitiveAction(
			actor,
			headers,
			"notice.manage",
			id,
			credentials,
		);
		try {
			return await db.transaction(async (tx) => {
				if (!create) {
					const [current] = await tx
						.select({ id: notices.id })
						.from(notices)
						.where(eq(notices.id, id))
						.for("update");
					if (!current) throw new ApiError(404, "NOT_FOUND");
				}
				const values = input
					? {
							...input,
							startsAt: new Date(input.startsAt),
							endsAt: new Date(input.endsAt),
							updatedAt: new Date(),
						}
					: { active: false, updatedAt: new Date() };
				const [row] =
					create && input
						? await tx
								.insert(notices)
								.values({
									...input,
									id,
									createdBy: actor.user.id,
									startsAt: new Date(input.startsAt),
									endsAt: new Date(input.endsAt),
								})
								.returning()
						: await tx.update(notices).set(values).where(eq(notices.id, id)).returning();
				try {
					await recordAdminAction(
						tx,
						{
							actorId: audit.actorId,
							requestId: audit.requestId,
							reason: audit.reason,
							status: "succeeded",
						},
						"notice.manage",
						"notice",
						id,
						{ operation: create ? "create" : input ? "edit" : "disable" },
					);
				} catch {
					throw new ApiError(503, "ADMIN_AUDIT_UNAVAILABLE");
				}
				return row;
			});
		} catch (e) {
			await appendSensitiveOutcome(audit, "failed");
			throw e;
		}
	},
};
