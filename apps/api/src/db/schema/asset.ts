import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sites } from "./site";

export const assets = pgTable(
	"assets",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		siteId: uuid("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		uploaderId: text("uploader_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		key: text("key").notNull().unique(),
		stagingKey: text("staging_key").notNull().unique(),
		mime: text("mime").notNull(),
		size: integer("size").notNull(),
		width: integer("width"),
		height: integer("height"),
		status: text("status", { enum: ["pending", "ready", "deleting", "deleted"] })
			.notNull()
			.default("pending"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		index("assets_site_status_idx").on(t.siteId, t.status),
		check("asset_size_limit", sql`${t.size}>0 AND ${t.size}<=5242880`),
		check("asset_mime_allowed", sql`${t.mime} IN ('image/png','image/jpeg','image/webp')`),
		check("asset_status_allowed", sql`${t.status} IN ('pending','ready','deleting','deleted')`),
	],
);
