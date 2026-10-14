import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sites } from "./site";
export const rateBuckets = pgTable("rate_buckets", {
	key: text("key").primaryKey(),
	count: integer("count").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const inquiries = pgTable(
	"inquiries",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		email: text("email").notNull(),
		message: text("message").notNull(),
		status: text("status").$type<"new" | "read" | "archived">().notNull().default("new"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("inquiries_site_created_idx").on(t.siteId, t.createdAt, t.id),
		check("inquiries_status_allowed", sql`${t.status} in ('new','read','archived')`),
	],
);
