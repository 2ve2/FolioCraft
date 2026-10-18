import type { Draft } from "@ichnara/contracts";
import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sites = pgTable(
	"sites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.unique(),
		slug: text("slug").notNull().unique(),
		revision: integer("revision").notNull().default(0),
		draft: jsonb("draft").$type<Draft>().notNull(),
		publishedReleaseId: uuid("published_release_id"),
		suspended: boolean("suspended").notNull().default(false),
		suspensionReason: text("suspension_reason"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [check("revision_nonnegative", sql`${t.revision} >= 0`)],
);
export const releases = pgTable(
	"releases",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		revision: integer("revision").notNull(),
		snapshot: jsonb("snapshot").$type<Draft>().notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [uniqueIndex("release_site_revision_idx").on(t.siteId, t.revision)],
);
