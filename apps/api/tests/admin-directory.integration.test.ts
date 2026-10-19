import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema/auth";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];

afterAll(async () => {
	if (ids.length) await db.delete(user).where(inArray(user.id, ids));
});
test("directory keysets traverse equal creation dates without gaps and apply identity filters", async () => {
	const owner = await account("directory-owner", ids);
	await db.update(user).set({ role: "owner" }).where(eq(user.id, owner.id));
	const prefix = `directory-${crypto.randomUUID()}`;
	const targets = [];
	for (let i = 0; i < 3; i++) {
		const member = await account(`${prefix}-${i}`, ids);
		targets.push(member);
		await db
			.update(user)
			.set({
				name: prefix,
				createdAt: new Date("2026-01-01"),
				emailVerified: i === 0,
				banned: i === 2,
			})
			.where(eq(user.id, member.id));
	}
	let cursor: string | null = null;
	const found: string[] = [];
	do {
		const page: {
			items: { id: string; email: string; siteCount: number }[];
			nextCursor: string | null;
		} = await result(
			await request(
				`/api/admin/users?limit=1&search=${prefix}${cursor ? `&cursor=${cursor}` : ""}`,
				"GET",
				undefined,
				owner.cookie,
			),
		);
		found.push(...page.items.map((r) => r.id));
		for (const row of page.items) {
			expect(row.email).toContain("***@");
			expect(row.siteCount).toBe(0);
		}
		cursor = page.nextCursor;
	} while (cursor);
	expect(found).toEqual(targets.map((t) => t.id).sort());
	for (const filter of ["verified=true", "banned=true"]) {
		const page = await result<{ items: unknown[] }>(
			await request(`/api/admin/users?search=${prefix}&${filter}`, "GET", undefined, owner.cookie),
		);
		expect(page.items.length).toBe(1);
	}
	await error(await request("/api/admin/users?offset=1", "GET", undefined, owner.cookie), 400);
});
test("all staff directory detail reads exclude draft bodies and published locale before publication", async () => {
	const target = await account("directory-site", ids);
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `directory-${crypto.randomUUID()}`, locale: "ar" },
			target.cookie,
		),
	);
	for (const role of ["owner", "moderator", "support", "analyst", "user"]) {
		const actor = await account(`directory-${role}`, ids);
		await db.update(user).set({ role }).where(eq(user.id, actor.id));
		for (const path of [
			`/users?search=directory-site`,
			`/users/${target.id}`,
			`/users/${target.id}/sessions`,
			`/sites?ownerId=${target.id}&reported=false`,
			`/sites/${site.id}`,
			`/reports?ownerId=${target.id}`,
			`/reports?siteId=${site.id}`,
		]) {
			const response = await request(`/api/admin${path}`, "GET", undefined, actor.cookie);
			if (role === "user") {
				expect(response.status).toBe(403);
				continue;
			}
			expect(response.status).toBe(200);
			const body = await response.text();
			expect(body).not.toContain('"draft"');
			expect(body).not.toContain('"snapshot"');
			expect(body).not.toContain('"token"');
			if (path === `/sites/${site.id}`) {
				expect(JSON.parse(body).result.locale).toBeNull();
			}
		}
	}
});

test("masked email search cannot be used as a prefix oracle without authoritative read_email", async () => {
	const target = await account(`private-${crypto.randomUUID()}`, ids);
	await db.update(user).set({ name: "Unrelated visible name" }).where(eq(user.id, target.id));
	const [stored] = await db.select({ email: user.email }).from(user).where(eq(user.id, target.id));
	if (!stored) throw new Error("Missing fixture");
	for (const role of ["analyst", "moderator", "owner", "support"]) {
		const actor = await account(`oracle-${role}`, ids);
		await db.update(user).set({ role }).where(eq(user.id, actor.id));
		for (const search of [stored.email, stored.email.slice(0, 12), stored.email.split("@")[0]]) {
			const page = await result<{ items: { id: string }[] }>(
				await request(
					`/api/admin/users?search=${encodeURIComponent(search)}`,
					"GET",
					undefined,
					actor.cookie,
				),
			);
			expect(page.items.some((row) => row.id === target.id)).toBe(
				role === "owner" || role === "support",
			);
		}
		const names = await result<{ items: { id: string }[] }>(
			await request("/api/admin/users?search=Unrelated%20visible", "GET", undefined, actor.cookie),
		);
		expect(names.items.some((row) => row.id === target.id)).toBe(true);
		await error(
			await request(
				"/api/admin/users?search=private&canSearchEmail=true",
				"GET",
				undefined,
				actor.cookie,
			),
			400,
		);
	}
});
