import "./test-guard";
import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { db } from "../src/db";
import { rateBuckets } from "../src/db/schema/operations";
import { rateLimitService } from "../src/services/rateLimitService";
import { request } from "./helpers";

test("health/readiness and method boundaries report actual database health", async () => {
	for (const endpoint of ["/health", "/ready"]) {
		const response = await request(endpoint);
		expect(response.status).toBe(200);
		expect(((await response.json()) as { status: boolean }).status).toBe(true);
		expect(response.headers.get("X-Request-Id")).toBeTruthy();
	}
	expect((await request("/not-a-route")).status).toBe(404);
	expect((await request("/health", "DELETE")).status).toBe(404);
});

test("readiness reports a real refused database connection as unavailable", async () => {
	const application = new URL("../src/app.ts", import.meta.url).pathname;
	const source = `const {default:app}=await import(${JSON.stringify(application)}); const res=await app.request("http://localhost:4000/ready"); console.log(JSON.stringify({status:res.status,body:await res.json()}));`;
	const child = Bun.spawn([process.execPath, "-e", source], {
		env: {
			...process.env,
			DATABASE_URL: "postgresql://folio@127.0.0.1:1/folio_test",
			DB_CONNECT_TIMEOUT_MS: "500",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(await child.exited).toBe(0);
	const response = JSON.parse(await new Response(child.stdout).text()) as {
		status: number;
		body: { status: boolean; code: string };
	};
	expect(response.status).toBe(503);
	expect(response.body).toEqual({ status: false, code: "DATABASE_UNAVAILABLE" });
}, 10_000);

test("PostgreSQL client bounds stalled reads independently of server statement deadlines", async () => {
	const boundedPool = new Pool({
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 500,
		query_timeout: 80,
	});
	try {
		await expect(boundedPool.query("select pg_sleep(0.3)")).rejects.toThrow("Query read timeout");
	} finally {
		await boundedPool.end();
	}
});

test("concurrent rate-limit consumption is atomic in PostgreSQL and expires using database time", async () => {
	const key = `integration-rate-${crypto.randomUUID()}`;
	const digest = new Bun.CryptoHasher("sha256").update(key).digest("hex");
	try {
		const attempts = await Promise.all(
			Array.from({ length: 20 }, () => rateLimitService.consume(key, 7, 60)),
		);
		expect(attempts.filter((item) => item.allowed)).toHaveLength(7);
		expect(attempts.filter((item) => !item.allowed)).toHaveLength(13);
		for (const blocked of attempts.filter((item) => !item.allowed))
			expect(blocked.retryAfter).toBeGreaterThan(0);
		const [row] = await db.select().from(rateBuckets).where(eq(rateBuckets.key, digest));
		expect(row.count).toBe(8);
		await db
			.update(rateBuckets)
			.set({ expiresAt: new Date(Date.now() - 1000) })
			.where(eq(rateBuckets.key, digest));
		expect((await rateLimitService.consume(key, 7, 60)).allowed).toBe(true);
		expect((await db.select().from(rateBuckets).where(eq(rateBuckets.key, digest)))[0].count).toBe(
			1,
		);
	} finally {
		await db.delete(rateBuckets).where(eq(rateBuckets.key, digest));
	}
});
