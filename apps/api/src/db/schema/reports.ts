import { newId, reportCategories, reportStatuses } from "@ichnara/contracts";
import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sites } from "./site";

export const contentReports = pgTable(
	"content_reports",
	{
		id: text("id").primaryKey().$defaultFn(newId),
		siteId: text("site_id")
			.notNull()
			.references(() => sites.id, { onDelete: "cascade" }),
		category: text("category", { enum: reportCategories }).notNull(),
		message: text("message").notNull(),
		reporterEmail: text("reporter_email"),
		reporterIpHash: text("reporter_ip_hash").notNull(),
		status: text("status", { enum: reportStatuses }).notNull().default("open"),
		handledBy: text("handled_by").references(() => user.id, { onDelete: "set null" }),
		handledAt: timestamp("handled_at", { withTimezone: true }),
		resolutionNote: text("resolution_note"),
		createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
	},
	(t) => [
		index("reports_status_created_idx").on(t.status, t.createdAt, t.id),
		index("reports_created_idx").on(t.createdAt, t.id),
		index("reports_site_idx").on(t.siteId),
		index("reports_category_created_idx").on(t.category, t.createdAt, t.id),
		check(
			"report_category_allowed",
			sql`${t.category} in ('spam','impersonation','illegal','harassment','copyright','other')`,
		),
		check("report_status_allowed", sql`${t.status} in ('open','reviewing','actioned','dismissed')`),
		check("report_message_length", sql`char_length(${t.message}) between 10 and 1000`),
		check(
			"report_email_length",
			sql`${t.reporterEmail} is null or char_length(${t.reporterEmail})<=254`,
		),
		check("report_ip_hash_format", sql`${t.reporterIpHash} ~ '^[a-f0-9]{64}$'`),
		check(
			"report_resolution_length",
			sql`${t.resolutionNote} is null or char_length(${t.resolutionNote}) between 10 and 500`,
		),
		check(
			"report_closure_note",
			sql`${t.status} not in ('actioned','dismissed') or (${t.resolutionNote} is not null and ${t.handledAt} is not null)`,
		),
	],
);
