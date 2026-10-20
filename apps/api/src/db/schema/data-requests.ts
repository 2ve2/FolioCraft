import { dataRequestStatuses, dataRequestTypes, newId } from "@ichnara/contracts";
import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
export const dataRequests = pgTable(
	"data_requests",
	{
		id: text("id").primaryKey().$defaultFn(newId),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		email: text("email").notNull(),
		type: text("type", { enum: dataRequestTypes }).notNull(),
		status: text("status", { enum: dataRequestStatuses }).notNull().default("received"),
		dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
		handledBy: text("handled_by").references(() => user.id, { onDelete: "set null" }),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		subjectVerifiedAt: timestamp("subject_verified_at", { withTimezone: true }),
		subjectVerifiedBy: text("subject_verified_by").references(() => user.id, {
			onDelete: "set null",
		}),
	},
	(t) => [
		index("data_requests_due_idx").on(t.dueAt, t.id),
		index("data_requests_status_idx").on(t.status, t.createdAt, t.id),
		check("data_request_type", sql`${t.type} in ('export','delete','correction')`),
		check(
			"data_request_status",
			sql`${t.status} in ('received','in_progress','completed','rejected')`,
		),
		check("data_request_email_length", sql`char_length(${t.email}) between 3 and 254`),
		check(
			"data_request_notes_length",
			sql`${t.notes} is null or char_length(${t.notes}) between 10 and 500`,
		),
		check(
			"data_request_closure",
			sql`${t.status} not in ('completed','rejected') or (${t.notes} is not null and ${t.completedAt} is not null)`,
		),
		check("data_request_subject", sql`${t.userId} is null or ${t.subjectVerifiedAt} is not null`),
	],
);
