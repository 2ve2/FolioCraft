import { Client, type PoolConfig } from "pg";

export type DatabaseBindings = {
	HYPERDRIVE?: { connectionString: string };
	DB_TIMING_LOGS?: string;
};

type VerifyOptions = {
	statementTimeoutMs: number;
	connectionTimeoutMillis: number;
	queryTimeoutMs: number;
};

/**
 * Isolate-wide verification state. Only plain values are kept (never sockets or promises), so
 * no I/O object crosses requests. Exported so tests can observe and reset it.
 */
export const hyperdriveVerification = {
	verified: undefined as string | undefined,
	retryAfter: 0,
	checks: 0,
};
const retryDelayMs = 60_000;

/**
 * Decides whether this request may use the Hyperdrive binding. Transaction pooling resets
 * session SETs, so the origin role/database must bound statements itself. That default is
 * checked once per isolate instead of on every request; when it is missing or Hyperdrive is
 * unreachable, requests keep the bounded direct DATABASE_URL path and a warning is logged.
 */
export async function useHyperdrive(
	binding: DatabaseBindings["HYPERDRIVE"],
	options: VerifyOptions,
): Promise<boolean> {
	if (!binding) return false;
	const state = hyperdriveVerification;
	if (state.verified === binding.connectionString) return true;
	if (Date.now() < state.retryAfter) return false;
	state.checks++;
	const client = new Client({
		connectionString: binding.connectionString,
		connectionTimeoutMillis: options.connectionTimeoutMillis,
		query_timeout: options.queryTimeoutMs,
	});
	// A failed check must surface only as the fallback below, never as an unhandled event.
	client.on("error", () => {});
	let reason = "unavailable";
	try {
		await client.connect();
		const result = await client.query(
			"select setting::int as timeout from pg_settings where name = 'statement_timeout'",
		);
		const timeout = Number(result.rows[0]?.timeout);
		if (Number.isFinite(timeout) && timeout > 0 && timeout <= options.statementTimeoutMs) {
			state.verified = binding.connectionString;
			state.retryAfter = 0;
			return true;
		}
		reason = "statement_timeout";
	} catch {
		// The reason stays "unavailable"; error details may carry connection data.
	} finally {
		await client.end().catch(() => {});
	}
	state.retryAfter = Date.now() + retryDelayMs;
	console.error(JSON.stringify({ event: "hyperdrive_unverified", reason, fallback: "direct" }));
	return false;
}

/** Pool settings for a verified binding; Hyperdrive owns only origin connection pooling. */
export function hyperdriveConfig(binding: { connectionString: string }): Partial<PoolConfig> {
	// The origin default (verified above) bounds statements; startup options are not supported.
	return { connectionString: binding.connectionString, statement_timeout: false };
}
