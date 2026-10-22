import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { newId, type PublicSite, type Site } from "@ichnara/contracts";
import { eq, inArray, sql } from "drizzle-orm";
import { env } from "../src/config/env";
import { db, withRequestDatabase } from "../src/db";
import { hyperdriveConfig } from "../src/db/hyperdrive";
import { user } from "../src/db/schema/auth";
import { releases, sites } from "../src/db/schema/site";
import { databaseTiming } from "../src/db/timing";
import { account, request, result } from "./helpers";

const ids: string[] = [];
/** Local-only startup options stand in for an origin role default, not a real Hyperdrive pooler. */
function binding(timeout: number) {
	const url = new URL(env.DATABASE_URL);
	url.searchParams.set("options", `-c statement_timeout=${timeout}`);
	return { connectionString: url.href };
}
afterAll(async () => {
	if (ids.length) await db.delete(user).where(inArray(user.id, ids));
});

test("absent Hyperdrive preserves the exact pool configuration; unsafe origin deadlines fail closed", async () => {
	expect(hyperdriveConfig(undefined, 15000)).toEqual({});
	for (const timeout of [0, 16000]) {
		await expect(
			withRequestDatabase(() => db.execute(sql`select 1`), "request", {
				hyperdrive: binding(timeout),
			}),
		).rejects.toThrow();
	}
	const direct = await withRequestDatabase(() => db.execute(sql`show statement_timeout`));
	expect(direct.rows[0].statement_timeout).toBe("15s");
});

test("optional binding publishes only the active snapshot and rolls back release and pointer together", async () => {
	const owner = await account("hyperdrive", ids);
	let site = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{
				slug: `hyperdrive-${newId().slice(0, 12)}`,
				locale: "ar",
			},
			owner.cookie,
		),
	);
	site.draft.profile.name = "Published fixture";
	site.draft.profile.role = "Engineer";
	site = await result<Site>(
		await request(
			`/api/sites/${site.id}/draft`,
			"PUT",
			{
				revision: site.revision,
				draft: site.draft,
			},
			owner.cookie,
		),
	);
	await withRequestDatabase(
		async () => {
			const release = await result<{ id: string }>(
				await request(
					`/api/sites/${site.id}/releases`,
					"POST",
					{
						revision: site.revision,
					},
					owner.cookie,
				),
			);
			const unpublishedId = newId();
			const failure = new Error("synthetic rollback");
			await expect(
				db.transaction(
					async (tx) => {
						const first = await tx.execute(
							sql`select pg_backend_pid() as pid, current_setting('transaction_isolation') as isolation`,
						);
						await tx
							.insert(releases)
							.values({ id: unpublishedId, siteId: site.id, revision: 9999, snapshot: site.draft });
						await tx
							.update(sites)
							.set({ publishedReleaseId: unpublishedId })
							.where(eq(sites.id, site.id));
						const second = await tx.execute(sql`select pg_backend_pid() as pid`);
						expect(first.rows[0].pid).toBe(second.rows[0].pid);
						expect(first.rows[0].isolation).toBe("serializable");
						throw failure;
					},
					{ isolationLevel: "serializable" },
				),
			).rejects.toBe(failure);
			expect(await db.select().from(releases).where(eq(releases.id, unpublishedId))).toHaveLength(
				0,
			);
			const pointer = await db.select().from(sites).where(eq(sites.id, site.id));
			expect(pointer[0].publishedReleaseId).toBe(release.id);
			site.draft.profile.name = "Private next draft";
			await result(
				await request(
					`/api/sites/${site.id}/draft`,
					"PUT",
					{ revision: site.revision, draft: site.draft },
					owner.cookie,
				),
			);
			const published = await result<PublicSite>(await request(`/api/public/sites/${site.slug}`));
			expect(published.draft.profile.name).toBe("Published fixture");
			await result(await request(`/api/sites/${site.id}/unpublish`, "POST", {}, owner.cookie));
			expect((await request(`/api/public/sites/${site.slug}`)).status).toBe(404);
		},
		"request",
		{ hyperdrive: binding(15000) },
	);
});

test("origin statement timeout cancels slow queries while the request client remains reusable", async () => {
	await withRequestDatabase(
		async () => {
			try {
				await db.execute(sql`select pg_sleep(2)`);
				throw new Error("Expected server cancellation");
			} catch (error) {
				expect((error as { cause?: { code?: string } }).cause?.code).toBe("57014");
			}
			expect((await db.execute(sql`select 1 as ready`)).rows[0].ready).toBe(1);
		},
		"request",
		{ hyperdrive: binding(1000) },
	);
});

test("timing preserves pg promise/callback/error behavior and retains only numeric counters", async () => {
	const timing = databaseTiming();
	const client = new timing.Client({ connectionString: env.DATABASE_URL });
	try {
		await client.connect();
		await client.query("select $1::text as private_value", ["synthetic-sensitive-value"]);
		await new Promise<void>((resolve, reject) =>
			client.query("select 1", (error) => (error ? reject(error) : resolve())),
		);
		await expect(client.query("select 1/0")).rejects.toThrow();
		expect(timing.totals.connections).toBe(1);
		expect(timing.totals.queries).toBe(3);
		expect(timing.totals.queryErrors).toBe(1);
		expect(
			Object.values(timing.totals).every((value) => typeof value === "number" && value >= 0),
		).toBe(true);
		expect(JSON.stringify(timing.totals)).not.toContain("synthetic-sensitive-value");
	} finally {
		await client.end();
	}
});
