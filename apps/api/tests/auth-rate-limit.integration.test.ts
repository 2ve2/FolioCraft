import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { like } from "drizzle-orm";
import { db } from "../src/db";
import { rateLimit } from "../src/db/schema/auth";
import { request } from "./helpers";

// A documentation-range address unique to this run, so its buckets never meet real ones.
const address = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
afterAll(async () => {
	await db.delete(rateLimit).where(like(rateLimit.key, `${address}|%`));
});

test("session reads stay available to a busy shared address while other auth paths keep the global limit", async () => {
	await db.delete(rateLimit).where(like(rateLimit.key, `${address}|%`));
	for (let index = 0; index < 110; index += 1) {
		const response = await request("/api/auth/get-session", "GET", undefined, undefined, address);
		expect(response.status).toBe(200);
	}
	const statuses: number[] = [];
	for (let index = 0; index < 101; index += 1)
		statuses.push((await request("/api/auth/ok", "GET", undefined, undefined, address)).status);
	expect(statuses.slice(0, 100).every((status) => status === 200)).toBe(true);
	expect(statuses[100]).toBe(429);
});
