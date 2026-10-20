import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { newId, type Site } from "@ichnara/contracts";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "../src/db";
import { assets } from "../src/db/schema/asset";
import { rateLimit, session, user, verification } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { storageDeletions } from "../src/db/schema/storage";
import {
	enqueueStorageDeletion,
	type MaintenanceStorage,
	maintenanceService,
} from "../src/services/maintenance";
import { account, request, result } from "./helpers";

const ids: string[] = [];
const tag = newId();

afterAll(async () => {
	await db.delete(storageDeletions).where(like(storageDeletions.prefix, `%${tag}%`));
	await db.delete(rateBuckets).where(like(rateBuckets.key, `${tag}%`));
	await db.delete(rateLimit).where(like(rateLimit.key, `${tag}%`));
	await db.delete(verification).where(like(verification.identifier, `${tag}%`));
	if (ids.length) await db.delete(user).where(inArray(user.id, ids));
});

/** In-memory object store that records deletions. */
function memoryStore(
	keys: string[],
	failing = new Set<string>(),
): MaintenanceStorage & {
	objects: Set<string>;
} {
	const objects = new Set(keys);
	return {
		configured: true,
		objects,
		async listKeys(prefix, limit) {
			if (failing.has(prefix)) throw new Error("provider failure");
			return [...objects].filter((key) => key.startsWith(prefix)).slice(0, limit);
		},
		async delete(key) {
			objects.delete(key);
		},
	};
}

test("maintenance removes only expired housekeeping rows", async () => {
	const owner = await account("maintenance", ids);
	const now = new Date();
	const old = new Date(now.getTime() - 3 * 86_400_000);
	const future = new Date(now.getTime() + 86_400_000);
	await db.insert(rateBuckets).values([
		{ key: `${tag}-old`, count: 1, expiresAt: old },
		{ key: `${tag}-live`, count: 1, expiresAt: future },
	]);
	await db.insert(rateLimit).values([
		{ id: newId(), key: `${tag}-old`, count: 1, lastRequest: old.getTime() },
		{ id: newId(), key: `${tag}-live`, count: 1, lastRequest: now.getTime() },
	]);
	await db.insert(verification).values([
		{ id: newId(), identifier: `${tag}-old`, value: "x", expiresAt: old },
		{ id: newId(), identifier: `${tag}-live`, value: "x", expiresAt: future },
	]);
	const expiredSession = newId();
	await db.insert(session).values({
		id: expiredSession,
		token: newId(),
		userId: owner.id,
		expiresAt: old,
	});

	const report = await maintenanceService.run({ store: memoryStore([]), now });
	expect(report.rateBuckets).toBeGreaterThanOrEqual(1);
	expect(report.sessions).toBeGreaterThanOrEqual(1);
	const keys = async (table: typeof rateBuckets | typeof rateLimit) =>
		(
			await db
				.select({ key: table.key })
				.from(table)
				.where(like(table.key, `${tag}%`))
		).map((row) => row.key);
	expect(await keys(rateBuckets)).toEqual([`${tag}-live`]);
	expect(await keys(rateLimit)).toEqual([`${tag}-live`]);
	expect(
		(
			await db
				.select({ id: verification.identifier })
				.from(verification)
				.where(like(verification.identifier, `${tag}%`))
		).map((row) => row.id),
	).toEqual([`${tag}-live`]);
	expect(await db.select().from(session).where(eq(session.id, expiredSession))).toHaveLength(0);
	// The account's current sign-in session is untouched.
	expect(
		(await db.select().from(session).where(eq(session.userId, owner.id))).length,
	).toBeGreaterThanOrEqual(1);
});

test("abandoned uploads are retired and queued objects are deleted in bounded batches", async () => {
	const owner = await account("maintenance-storage", ids);
	const site = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `maint-${tag.slice(0, 12)}`, locale: "en" },
			owner.cookie,
		),
	);
	const now = new Date();
	const asset = (status: "pending" | "ready", expiresAt: Date) => {
		const id = newId();
		return {
			id,
			siteId: site.id,
			uploaderId: owner.id,
			key: `verified/${site.id}/${id}`,
			stagingKey: `staging/${site.id}/${id}`,
			mime: "image/png",
			size: 10,
			status,
			expiresAt,
		};
	};
	const abandoned = asset("pending", new Date(now.getTime() - 2 * 3_600_000));
	const fresh = asset("pending", new Date(now.getTime() + 600_000));
	const ready = asset("ready", new Date(now.getTime() - 2 * 3_600_000));
	await db.insert(assets).values([abandoned, fresh, ready]);

	const removedPrefix = `verified/${tag}/`;
	const failingPrefix = `staging/${tag}/`;
	await enqueueStorageDeletion(db, [removedPrefix, failingPrefix], "account_removed");
	await enqueueStorageDeletion(db, [removedPrefix], "account_removed"); // duplicate ignored
	const store = memoryStore(
		[
			abandoned.stagingKey,
			fresh.stagingKey,
			ready.key,
			`${removedPrefix}a`,
			`${removedPrefix}b`,
			`${failingPrefix}c`,
			"verified/unrelated/keep",
		],
		new Set([failingPrefix]),
	);

	const report = await maintenanceService.run({ store, now });
	expect(report.abandonedUploads).toBeGreaterThanOrEqual(1);
	const status = async (id: string) =>
		(await db.select({ status: assets.status }).from(assets).where(eq(assets.id, id)))[0].status;
	expect(await status(abandoned.id)).toBe("deleted");
	expect(await status(fresh.id)).toBe("pending");
	expect(await status(ready.id)).toBe("ready");
	expect(store.objects.has(abandoned.stagingKey)).toBe(false);
	expect(store.objects.has(fresh.stagingKey)).toBe(true);
	expect(store.objects.has(ready.key)).toBe(true);
	expect(store.objects.has(`${removedPrefix}a`)).toBe(false);
	expect(store.objects.has("verified/unrelated/keep")).toBe(true);
	// A provider failure keeps the prefix queued with an attempt counted for the next run.
	expect(store.objects.has(`${failingPrefix}c`)).toBe(true);
	const queue = await db
		.select()
		.from(storageDeletions)
		.where(like(storageDeletions.prefix, `%${tag}%`));
	expect(queue.map((row) => [row.prefix, row.attempts])).toEqual([[failingPrefix, 1]]);
	if (report.storage === "disabled") throw new Error("storage expected");
	expect(report.storage.failures).toBeGreaterThanOrEqual(1);

	// Without configured storage the database jobs still run and the queue is left intact.
	const disabled = await maintenanceService.run({ store: { ...store, configured: false }, now });
	expect(disabled.storage).toBe("disabled");
});

test("the queue rejects prefixes that could reach the whole bucket", async () => {
	for (const prefix of ["", "verified/", "staging", "other/site/"])
		expect(enqueueStorageDeletion(db, [prefix], "account_removed")).rejects.toThrow();
});
