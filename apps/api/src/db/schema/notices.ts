import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
export const systemNotices = pgTable(
	"system_notices",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		kind: text("kind").$type<"info" | "maintenance" | "incident">().notNull(),
		messageAr: text("message_ar").notNull(),
		messageEn: text("message_en").notNull(),
		startsAt: timestamp("starts_at", { withTimezone: true, precision: 3 }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true, precision: 3 }).notNull(),
		active: boolean("active").notNull().default(false),
		createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
	},
	(t) => [
		index("system_notices_window_idx").on(t.active, t.startsAt, t.endsAt),
		check("system_notices_kind_allowed", sql`${t.kind} in ('info','maintenance','incident')`),
		check("system_notices_window_order", sql`${t.endsAt} > ${t.startsAt}`),
		check(
			"system_notices_message_bounds",
			sql`char_length(btrim(${t.messageAr})) between 1 and 1000 and char_length(btrim(${t.messageEn})) between 1 and 1000`,
		),
	],
);
