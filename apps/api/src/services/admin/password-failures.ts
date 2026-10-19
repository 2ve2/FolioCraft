import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { env } from "../../config/env";
import { db } from "../../db";
import { ApiError } from "../../lib/response-helpers";

/** Shares only password failures across all sensitive actions, independent of HTTP write budgets. */
export const passwordFailures = {
	key(actorId: string) {
		return createHash("sha256").update(`admin-password-failure:${actorId}`).digest("hex");
	},
	async check(actorId: string) {
		const result = await db.execute(sql`select 1 from rate_buckets
			where key=${this.key(actorId)} and count>=${env.ADMIN_PASSWORD_MAX_FAILURES}
			and expires_at>clock_timestamp()`);
		if (result.rowCount) throw new ApiError(429, "ADMIN_PASSWORD_BLOCKED");
	},
	async fail(actorId: string) {
		const max = env.ADMIN_PASSWORD_MAX_FAILURES;
		// The threshold failure starts a full block. Later concurrent failures cannot extend it.
		await db.execute(sql`insert into rate_buckets (key,count,expires_at)
			values (${this.key(actorId)},1,clock_timestamp()+make_interval(secs=>${max === 1 ? env.ADMIN_PASSWORD_BLOCK_SECONDS : env.ADMIN_PASSWORD_WINDOW_SECONDS}))
			on conflict (key) do update set
			count=case when rate_buckets.expires_at<=clock_timestamp() then 1 else least(rate_buckets.count+1,${max}) end,
			expires_at=case
			when rate_buckets.expires_at<=clock_timestamp() then clock_timestamp()+make_interval(secs=>${max === 1 ? env.ADMIN_PASSWORD_BLOCK_SECONDS : env.ADMIN_PASSWORD_WINDOW_SECONDS})
			when rate_buckets.count=${max - 1} then clock_timestamp()+make_interval(secs=>${env.ADMIN_PASSWORD_BLOCK_SECONDS})
			else rate_buckets.expires_at end`);
	},
};
