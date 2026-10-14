import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

export const rateLimitService = {
	/** Atomically consumes a hashed rate bucket across instances using the database clock. */
	async consume(key: string, limit: number, windowSeconds: number) {
		const digest = createHash("sha256").update(key).digest("hex");
		const result = await db.execute<{ count: number; retry_after: number }>(sql`
   insert into rate_buckets (key,count,expires_at)
   values (${digest},1,clock_timestamp() + make_interval(secs=>${windowSeconds}))
   on conflict (key) do update set
    count=case when rate_buckets.expires_at <= clock_timestamp() then 1 else least(rate_buckets.count + 1, ${limit + 1}) end,
    expires_at=case when rate_buckets.expires_at <= clock_timestamp() then clock_timestamp() + make_interval(secs=>${windowSeconds}) else rate_buckets.expires_at end
   returning count, greatest(1,ceil(extract(epoch from (expires_at-clock_timestamp()))))::integer as retry_after`);
		const row = result.rows[0];
		return { allowed: row.count <= limit, retryAfter: row.count <= limit ? null : row.retry_after };
	},

	/** Removes buckets that expired more than a day ago without affecting active windows. */
	async cleanup() {
		await db.execute(
			sql`delete from rate_buckets where expires_at < clock_timestamp() - interval '1 day'`,
		);
	},
};
