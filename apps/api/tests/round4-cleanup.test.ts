import "./test-guard";
import { expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { session, user } from "../src/db/schema/auth";
import { dataRequests } from "../src/db/schema/data-requests";

/** Opt-in final proof for the explicitly recorded disposable browser fixtures, never a cleanup action. */
test.skipIf(process.env.FOLIO_ROUND4_VERIFY_CLEANUP !== "true")(
	"round4 disposable browser accounts, sessions, audit and requests were removed",
	async () => {
		const ids = (await Bun.file(
			new URL("../../../work/round4/browser-fixture-ids.json", import.meta.url),
		).json()) as { users: string[]; requests: string[] };
		expect(ids.users.length).toBe(5);
		expect(ids.requests.length).toBeGreaterThan(0);
		for (const rows of [
			await db.select({ id: user.id }).from(user).where(inArray(user.id, ids.users)),
			await db.select({ id: session.id }).from(session).where(inArray(session.userId, ids.users)),
			await db
				.select({ id: adminAudit.id })
				.from(adminAudit)
				.where(inArray(adminAudit.actorId, ids.users)),
			await db
				.select({ id: dataRequests.id })
				.from(dataRequests)
				.where(inArray(dataRequests.id, ids.requests)),
		])
			expect(rows.length).toBe(0);
	},
);
