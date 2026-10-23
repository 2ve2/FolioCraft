import { isStaff } from "@ichnara/contracts/admin-policy";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { sites } from "../../db/schema/site";
import { affectPublicSite } from "../../services/cache-invalidation";
import { enqueueStorageDeletion, sitePrefixes } from "../../services/maintenance";

/** Site ids of accounts being deleted, captured before the database cascade removes the rows. */
const ownedSites = new Map<string, string[]>();

/**
 * Self-service account deletion (Better Auth `deleteUser`, password-confirmed). Staff accounts are
 * refused: they leave only through the reviewed role procedure, so the platform cannot lose its last
 * operator by accident. Ordinary accounts lose their sites through the database cascade, their
 * published pages are revalidated, and their stored images are queued for deletion afterwards.
 */
export const accountDeletion = {
	async beforeDelete(user: { id: string; role?: string | null }) {
		if (isStaff(user.role))
			throw new APIError("FORBIDDEN", {
				code: "STAFF_ACCOUNT_DELETION",
				message: "Staff accounts are removed through the reviewed procedure",
			});
		const rows = await db.select({ id: sites.id }).from(sites).where(eq(sites.ownerId, user.id));
		for (const row of rows) affectPublicSite(row.id);
		ownedSites.set(
			user.id,
			rows.map((row) => row.id),
		);
	},

	async afterDelete(user: { id: string }) {
		const siteIds = ownedSites.get(user.id) ?? [];
		ownedSites.delete(user.id);
		try {
			await enqueueStorageDeletion(db, sitePrefixes(siteIds), "account_removed");
		} catch (error) {
			// The account is already gone; a failed enqueue is logged for the operator, not raised.
			console.error(
				JSON.stringify({
					event: "storage_cleanup_enqueue_failed",
					sites: siteIds.length,
					name: error instanceof Error ? error.name : "unknown",
				}),
			);
		}
		console.info(JSON.stringify({ event: "account_self_deleted", sites: siteIds.length }));
	},
};
