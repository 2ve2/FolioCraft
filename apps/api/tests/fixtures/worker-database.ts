import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { env } from "../../src/config/env";
import { db, withRequestDatabase } from "../../src/db";
import worker from "../../src/worker";

/** Allows pending socket callbacks to finish inside the same test invocation. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

/** Exercises the real Worker/database scope without exposing probe routes in the application. */
export default {
	async fetch(request: Request) {
		const path = new URL(request.url).pathname;
		if (path === "/probe/scheduled") {
			let task: Promise<unknown> | undefined;
			worker.scheduled(
				null,
				{},
				{
					waitUntil: (pending) => {
						task = pending;
					},
				},
			);
			await task;
			await settle();
			return Response.json({ completed: true });
		}
		if (!path.startsWith("/probe/")) {
			const response = await worker.fetch(request, {});
			await settle();
			return response;
		}
		const result = await withRequestDatabase(async () => {
			const first = await db.execute(sql`select pg_backend_pid() as pid`);
			const pid = first.rows[0].pid;
			if (path === "/probe/transaction") {
				return db.transaction(async (tx) => {
					const one = await tx.execute(sql`select pg_backend_pid() as pid`);
					const two = await tx.execute(sql`select pg_backend_pid() as pid`);
					return { sameClient: one.rows[0].pid === two.rows[0].pid };
				});
			}
			if (path === "/probe/rollback") {
				const expected = new Error("synthetic rollback");
				try {
					await db.transaction(async (tx) => {
						await tx.execute(sql`select 1`);
						throw expected;
					});
				} catch (error) {
					if (error !== expected) throw error;
				}
				const after = await db.execute(sql`select pg_backend_pid() as pid`);
				return { reusableAfterRollback: after.rows[0].pid === pid };
			}
			if (path === "/probe/terminate") {
				// Terminate only this invocation's idle connection in the guarded local test database.
				const control = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
				try {
					await control.query("select pg_terminate_backend($1)", [pid]);
					await settle();
				} finally {
					await control.end();
				}
				return { terminated: true };
			}
			await settle();
			return { pid };
		});
		await settle();
		return Response.json(result);
	},
};
