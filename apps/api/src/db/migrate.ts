import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { z } from "zod";

// Migrations need only the database; auth secrets and origins stay with the running API.
const parsed = z
	.string({ error: "Set DATABASE_URL to the database you intend to migrate" })
	.startsWith("postgresql://", "DATABASE_URL must start with postgresql://")
	.safeParse(process.env.DATABASE_URL);
if (!parsed.success) {
	console.error(parsed.error.issues[0]?.message);
	process.exit(1);
}
const databaseUrl = parsed.data;
const target = new URL(databaseUrl);

// Names the target without credentials so the operator can confirm it before anything changes.
console.info(`Applying migrations to ${target.hostname}${target.pathname}`);
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
try {
	await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });
	console.info("Migrations applied");
} finally {
	await pool.end();
}
