import type { PoolConfig } from "pg";

export type DatabaseBindings = {
	HYPERDRIVE?: { connectionString: string };
	DB_TIMING_LOGS?: string;
};

/** Keep the unbound configuration unchanged; Hyperdrive owns only origin connection pooling. */
export function hyperdriveConfig(
	binding: DatabaseBindings["HYPERDRIVE"],
	statementTimeoutMs: number,
): Partial<PoolConfig> {
	if (!binding) return {};
	return {
		connectionString: binding.connectionString,
		// Transaction pooling resets session SETs. Require a bounded origin role/database default.
		statement_timeout: false,
		onConnect: async (client) => {
			const result = await client.query(
				"select setting::int as timeout from pg_settings where name = 'statement_timeout'",
			);
			const timeout = Number(result.rows[0]?.timeout);
			if (!Number.isFinite(timeout) || timeout <= 0 || timeout > statementTimeoutMs)
				throw new Error("HYPERDRIVE_STATEMENT_TIMEOUT_REQUIRED");
		},
	};
}
