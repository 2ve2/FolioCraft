import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Private R2 key prefixes whose objects must be deleted by scheduled maintenance. */
export const storageDeletions = pgTable(
	"storage_deletions",
	{
		prefix: text("prefix").primaryKey(),
		reason: text("reason").$type<"account_removed" | "abandoned_upload">().notNull(),
		attempts: integer("attempts").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("storage_deletions_created_idx").on(t.createdAt),
		check("storage_deletions_reason", sql`${t.reason} in ('account_removed','abandoned_upload')`),
		check("storage_deletions_prefix", sql`${t.prefix} ~ '^(staging|verified)/[A-Za-z0-9-]+/'`),
	],
);
