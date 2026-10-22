import { createRequire } from "node:module";

/** Temporarily sets and restores only the caller's role/database deadline in disposable folio_test. */
export async function withLocalStatementTimeout<T>(database: string, operation: () => Promise<T>) {
	const url = new URL(database);
	if (
		url.protocol !== "postgresql:" ||
		!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
		url.pathname !== "/folio_test" ||
		url.search ||
		url.hash
	)
		throw new Error("Deadline fixture requires local disposable folio_test without overrides");
	const { Pool } = createRequire(new URL("../apps/api/package.json", import.meta.url))("pg");
	const control = new Pool({ connectionString: database, max: 1 });
	let restore: string | undefined;
	try {
		const previous =
			await control.query(`select unnest(setconfig) as setting from pg_db_role_setting
			where setdatabase = (select oid from pg_database where datname = current_database())
			and setrole = (select oid from pg_roles where rolname = current_user)`);
		const setting: string | undefined = previous.rows
			.map((row: { setting: string }) => row.setting)
			.find((value: string) => value.startsWith("statement_timeout="));
		restore = setting
			? (
					await control.query(
						"select format('ALTER ROLE CURRENT_USER IN DATABASE folio_test SET statement_timeout = %L', $1::text) as command",
						[setting.slice("statement_timeout=".length)],
					)
				).rows[0].command
			: "ALTER ROLE CURRENT_USER IN DATABASE folio_test RESET statement_timeout";
		await control.query(
			"ALTER ROLE CURRENT_USER IN DATABASE folio_test SET statement_timeout = '15s'",
		);
		return await operation();
	} finally {
		try {
			if (restore) await control.query(restore);
		} finally {
			await control.end();
		}
	}
}
