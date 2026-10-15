import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { asc } from "drizzle-orm";
import { db, pool } from "./index";
import { user } from "./schema/auth";
import { releases, sites } from "./schema/site";

const file = resolve(import.meta.dir, "../../../../work/pre-migration-state.json");

/** Hashes stable pre-migration fields without writing raw account or portfolio data. */
const hashing = (value: unknown) =>
	new Bun.CryptoHasher("sha256").update(JSON.stringify(value)).digest("hex");

try {
	const [accounts, portfolios, versions] = await Promise.all([
		db.select({ id: user.id, email: user.email, name: user.name }).from(user).orderBy(asc(user.id)),
		db
			.select({
				id: sites.id,
				ownerId: sites.ownerId,
				slug: sites.slug,
				revision: sites.revision,
				draft: sites.draft,
				publishedReleaseId: sites.publishedReleaseId,
				createdAt: sites.createdAt,
				updatedAt: sites.updatedAt,
			})
			.from(sites)
			.orderBy(asc(sites.id)),
		db.select().from(releases).orderBy(asc(releases.id)),
	]);
	const state = {
		userCount: accounts.length,
		siteCount: portfolios.length,
		releaseCount: versions.length,
		userDigest: hashing(accounts),
		siteDigest: hashing(portfolios),
		releaseDigest: hashing(versions),
	};
	if (process.argv.includes("--capture")) {
		await mkdir(resolve(import.meta.dir, "../../../../work"), { recursive: true });
		await writeFile(file, JSON.stringify(state), { mode: 0o600 });
		console.info(
			JSON.stringify({
				event: "baseline_captured",
				userCount: state.userCount,
				siteCount: state.siteCount,
				releaseCount: state.releaseCount,
			}),
		);
	} else {
		const previous = JSON.parse(await readFile(file, "utf8"));
		if (JSON.stringify(previous) !== JSON.stringify(state))
			throw new Error("Existing database records changed during migration");
		console.info(
			JSON.stringify({
				event: "existing_data_preserved",
				userCount: state.userCount,
				siteCount: state.siteCount,
				releaseCount: state.releaseCount,
			}),
		);
	}
} finally {
	await pool.end();
}
