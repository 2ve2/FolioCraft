// Imported before application modules: no integration test may use the app's Neon .env.
const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== "test" || !databaseUrl) {
	throw new Error(
		"Use the isolated root test runner: NODE_ENV=test and a local test database are required",
	);
}
const database = new URL(databaseUrl);
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname)) {
	throw new Error("Integration tests refuse non-local database hosts");
}
if (!database.pathname.endsWith("/folio_test")) {
	throw new Error("Integration tests require the dedicated folio_test database");
}
