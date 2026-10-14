import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as adminSchema from "./schema/admin";
import * as assetSchema from "./schema/asset";
import * as authSchema from "./schema/auth";
import * as operationsSchema from "./schema/operations";
import * as siteSchema from "./schema/site";
export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: env.DB_POOL_MAX,
	connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS,
	statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
	// Also bound reads when a live socket stalls before PostgreSQL can answer.
	query_timeout: env.DB_STATEMENT_TIMEOUT_MS + 1000,
});
export const db = drizzle(pool, {
	schema: { ...adminSchema, ...authSchema, ...siteSchema, ...assetSchema, ...operationsSchema },
});

/** Keeps idle database disconnects observable without exposing queries or credentials. */
pool.on("error", (error) =>
	console.error(JSON.stringify({ event: "database_pool_error", name: error.name })),
);
