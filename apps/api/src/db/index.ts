import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import { type PoolStage, poolErrorDiagnostic } from "./pool-diagnostics";
import * as adminSchema from "./schema/admin";
import * as assetSchema from "./schema/asset";
import * as authSchema from "./schema/auth";
import * as requestSchema from "./schema/data-requests";
import * as noticeSchema from "./schema/notices";
import * as operationsSchema from "./schema/operations";
import * as reportSchema from "./schema/reports";
import * as siteSchema from "./schema/site";
import * as storageSchema from "./schema/storage";

const poolConfig = {
	connectionString: env.DATABASE_URL,
	max: env.DB_POOL_MAX,
	connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS,
	statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
	// Also bound reads when a live socket stalls before PostgreSQL can answer.
	query_timeout: env.DB_STATEMENT_TIMEOUT_MS + 1000,
};
const schema = {
	...adminSchema,
	...requestSchema,
	...noticeSchema,
	...reportSchema,
	...authSchema,
	...siteSchema,
	...assetSchema,
	...operationsSchema,
	...storageSchema,
};
export const pool = new Pool(poolConfig);
const defaultDatabase = drizzle(pool, { schema });
const requestDatabase = new AsyncLocalStorage<typeof defaultDatabase>();

/** Selects the request-owned connection in Workers while preserving the Bun pool outside that scope. */
export const db: typeof defaultDatabase = new Proxy(defaultDatabase, {
	/** Resolves ORM access against the current request database scope. */
	get(_target, property) {
		const database = requestDatabase.getStore() ?? defaultDatabase;
		const value = Reflect.get(database, property, database);
		return typeof value === "function" ? value.bind(database) : value;
	},
});

/** Prevents connections created by one edge request from leaking into another request. */
export async function withRequestDatabase<T>(
	operation: () => Promise<T>,
	stage: Exclude<PoolStage, "shared"> = "request",
): Promise<T> {
	const requestPool = new Pool({ ...poolConfig, max: 1 });
	requestPool.on("error", (error) =>
		console.error(JSON.stringify(poolErrorDiagnostic(error, stage, requestPool))),
	);
	try {
		return await requestDatabase.run(drizzle(requestPool, { schema }), operation);
	} finally {
		await requestPool.end();
	}
}

/** Keeps idle database disconnects observable without exposing queries or credentials. */
pool.on("error", (error) =>
	console.error(JSON.stringify(poolErrorDiagnostic(error, "shared", pool))),
);
