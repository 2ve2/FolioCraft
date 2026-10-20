import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { idSchema, newId, type Site } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { session, user } from "../src/db/schema/auth";
import { account, error, request, result } from "./helpers";

const cuid = /^[a-z][0-9a-z]{23}$/;
const ids: string[] = [];

afterAll(async () => {
	if (ids.length) await db.delete(user).where(inArray(user.id, ids));
});

test("newId issues unique cuid2 values and idSchema keeps legacy UUIDs valid", () => {
	const issued = new Set(Array.from({ length: 2000 }, () => newId()));
	expect(issued.size).toBe(2000);
	for (const id of issued) expect(id).toMatch(cuid);
	expect(idSchema.safeParse(newId()).success).toBe(true);
	expect(idSchema.safeParse(crypto.randomUUID()).success).toBe(true);
	for (const invalid of [
		"",
		"abc",
		newId().toUpperCase(),
		`${newId()}x`,
		"1bcdefghijklmnopqrstuvwx",
		"x' or '1'='1",
	])
		expect(idSchema.safeParse(invalid).success).toBe(false);
});

test("new accounts, sessions and sites receive cuid2 ids while legacy UUID paths stay addressable", async () => {
	const owner = await account("identifiers", ids);
	expect(owner.id).toMatch(cuid);
	const [stored] = await db
		.select({ id: session.id })
		.from(session)
		.where(eq(session.userId, owner.id))
		.limit(1);
	expect(stored.id).toMatch(cuid);

	const site = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `ids-${newId().slice(0, 12)}`, locale: "en" },
			owner.cookie,
		),
	);
	expect(site.id).toMatch(cuid);

	// A well-formed legacy UUID reaches ownership checks and is hidden as not found.
	await error(
		await request(`/api/sites/${crypto.randomUUID()}`, "GET", undefined, owner.cookie),
		404,
		"NOT_FOUND",
	);
	// Malformed identifiers never reach the database.
	await error(
		await request("/api/sites/not-an-id", "GET", undefined, owner.cookie),
		404,
		"NOT_FOUND",
	);
});
