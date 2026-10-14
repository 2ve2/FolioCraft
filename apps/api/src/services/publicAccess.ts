import { and, eq, isNull, lte, ne, or, sql } from "drizzle-orm";
import { user } from "../db/schema/auth";
import { sites } from "../db/schema/site";

/** Matches unbanned accounts and expired bans against the PostgreSQL clock in the existing UTC timestamp representation. */
export function activeOwnerPredicate() {
	return or(
		ne(user.banned, true),
		isNull(user.banned),
		lte(user.banExpires, sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`),
	);
}

/** Filters public reads to unsuspended sites whose owner has no active account ban. */
export function publicAccessPredicate() {
	return and(eq(sites.suspended, false), activeOwnerPredicate());
}
