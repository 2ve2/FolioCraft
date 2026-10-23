import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { rateBuckets } from "../src/db/schema/operations";
import { sites } from "../src/db/schema/site";
import { storageDeletions } from "../src/db/schema/storage";
import { passwordFailures } from "../src/services/admin/password-failures";
import { sitePrefixes } from "../src/services/maintenance";
import { account, error, request, result } from "./helpers";

// Real database; removes only the accounts, sites, queue rows and failure buckets it created.
const ids: string[] = [];
const siteIds: string[] = [];
afterAll(async () => {
	if (siteIds.length)
		await db
			.delete(storageDeletions)
			.where(inArray(storageDeletions.prefix, sitePrefixes(siteIds)));
	if (!ids.length) return;
	await db.delete(rateBuckets).where(
		inArray(
			rateBuckets.key,
			ids.map((id) => passwordFailures.key(id)),
		),
	);
	await db.delete(user).where(inArray(user.id, ids));
});

let address = 0;
const nextIp = () => `198.51.101.${++address}`;

test("the profile accepts only a bounded name", async () => {
	const owner = await account("profile", ids);
	const update = (body: unknown) =>
		request("/api/auth/update-user", "POST", body, owner.cookie, nextIp());

	expect((await update({ name: "  Renamed Owner  " })).status).toBe(200);
	const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, owner.id));
	expect(row.name).toBe("Renamed Owner");

	await error(await update({ name: "" }), 400, "INVALID_PROFILE");
	await error(await update({ name: "x".repeat(81) }), 400, "INVALID_PROFILE");
	await error(
		await update({ name: "Owner", image: "https://example.com/x.png" }),
		400,
		"INVALID_PROFILE",
	);
	await error(await update({ name: "Owner", role: "owner" }), 400, "INVALID_PROFILE");
});

test("changing the email needs configured mail delivery", async () => {
	const owner = await account("change-email", ids);
	await error(
		await request(
			"/api/auth/change-email",
			"POST",
			{ newEmail: `moved-${crypto.randomUUID()}@example.com` },
			owner.cookie,
			nextIp(),
		),
		503,
		"MAIL_UNAVAILABLE",
	);
});

test("self deletion needs the password, removes owned sites and queues their images", async () => {
	const owner = await account("self-delete", ids);
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `self-delete-${crypto.randomUUID().slice(0, 8)}`, locale: "en" },
			owner.cookie,
		),
	);
	siteIds.push(site.id);
	const remove = (body: unknown) =>
		request("/api/auth/delete-user", "POST", body, owner.cookie, nextIp());

	// A recent session alone is not enough, and a wrong password changes nothing.
	await error(await remove({}), 400, "PASSWORD_REQUIRED");
	await error(await remove({ password: "wrong-password-guess" }), 400, "INVALID_PASSWORD");
	expect(await db.select().from(user).where(eq(user.id, owner.id))).toHaveLength(1);

	expect((await remove({ password: owner.password })).status).toBe(200);
	expect(await db.select().from(user).where(eq(user.id, owner.id))).toHaveLength(0);
	expect(await db.select().from(sites).where(eq(sites.id, site.id))).toHaveLength(0);
	const queued = await db
		.select({ prefix: storageDeletions.prefix, reason: storageDeletions.reason })
		.from(storageDeletions)
		.where(or(...sitePrefixes([site.id]).map((prefix) => eq(storageDeletions.prefix, prefix))));
	expect(queued.map((row) => row.prefix).sort()).toEqual(sitePrefixes([site.id]).sort());
	expect(queued.every((row) => row.reason === "account_removed")).toBe(true);

	// The deleted account's session no longer opens anything.
	expect((await request("/api/me", "GET", undefined, owner.cookie)).status).toBe(401);
});

test("staff accounts cannot delete themselves", async () => {
	const staff = await account("staff-delete", ids);
	await db.update(user).set({ role: "owner" }).where(eq(user.id, staff.id));
	await error(
		await request(
			"/api/auth/delete-user",
			"POST",
			{ password: staff.password },
			staff.cookie,
			nextIp(),
		),
		403,
		"STAFF_ACCOUNT_DELETION",
	);
	expect(await db.select().from(user).where(eq(user.id, staff.id))).toHaveLength(1);
});
