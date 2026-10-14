import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const adminAudit = pgTable(
	"admin_audit",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
		action: text("action").notNull(),
		targetType: text("target_type").notNull(),
		targetId: text("target_id"),
		reason: text("reason"),
		requestId: text("request_id").notNull(),
		status: text("status")
			.$type<"attempted" | "succeeded" | "failed">()
			.notNull()
			.default("succeeded"),
		metadata: jsonb("metadata")
			.$type<Record<string, string | boolean | number | null>>()
			.notNull()
			.default({}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("admin_audit_created_idx").on(t.createdAt, t.id),
		index("admin_audit_actor_idx").on(t.actorId),
		check("admin_audit_status_allowed", sql`${t.status} in ('attempted','succeeded','failed')`),
	],
);
