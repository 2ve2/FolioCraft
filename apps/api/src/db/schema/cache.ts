import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

/** Transactional invalidation tombstones survive deletion and retain monotonic delivery generations. */
export const cacheInvalidations = pgTable(
	"cache_invalidations",
	{
		siteId: text("site_id").notNull(),
		slug: text("slug").notNull(),
		version: bigint("version", { mode: "number" }).notNull().default(1),
		deliveredVersion: bigint("delivered_version", { mode: "number" }).notNull().default(0),
		attempts: integer("attempts").notNull().default(0),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.siteId, t.slug] }),
		index("cache_invalidations_pending_idx")
			.on(t.updatedAt)
			.where(sql`${t.deliveredVersion} < ${t.version}`),
		check(
			"cache_invalidations_versions",
			sql`${t.version} > 0 and ${t.deliveredVersion} >= 0 and ${t.deliveredVersion} <= ${t.version}`,
		),
	],
);
