import { chmod, mkdir, open } from "node:fs/promises";
import { resolve } from "node:path";
import { emptyDraft, newId } from "../packages/contracts/src";

const verify = process.argv.includes("--verify-test");
const database = verify
	? (process.env.TEST_DATABASE_URL ?? "postgresql://folio@127.0.0.1:55432/folio_test")
	: process.env.DATABASE_URL;
if (!database) throw new Error("DATABASE_URL required; run from apps/api or supply environment");
const connection = new URL(database);
if (
	verify &&
	(!["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) ||
		connection.pathname !== "/folio_test")
)
	throw new Error("Restore verification only accepts isolated local folio_test");
const environment = {
	...process.env,
	PGHOST: connection.hostname.replace(/^\[|\]$/g, ""),
	PGCONNECT_TIMEOUT: "10",
	PGSSLROOTCERT:
		process.env.PGSSLROOTCERT ??
		(connection.searchParams.get("sslmode") === "verify-full" ? "system" : ""),
	PGPORT: connection.port || "5432",
	PGUSER: decodeURIComponent(connection.username),
	PGPASSWORD: decodeURIComponent(connection.password),
	PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
	PGSSLMODE: connection.searchParams.get("sslmode") ?? "prefer",
	PGCHANNELBINDING: connection.searchParams.get("channel_binding") ?? "prefer",
};
const directory = resolve(import.meta.dir, "../work/backups");
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const file = resolve(directory, `${verify ? "test" : "portfolio"}-${Date.now()}.dump`);
const handle = await open(file, "wx", 0o600);
/** Runs PostgreSQL utilities without putting connection secrets in command arguments. */
async function command(args: string[], override: Record<string, string> = {}) {
	const child = Bun.spawn(args, {
		env: { ...environment, ...override },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, err, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0)
		throw new Error(
			`Database utility ${args[0]} failed (${code}); check local tool/server configuration`,
		);
	return { out, err };
}
const fixtureUser = newId();
const fixtureSite = newId();
const fixtureRelease = newId();
const fixture = emptyDraft("ar");
fixture.profile.name = "اختبار الاستعادة";
fixture.profile.role = "بيانات اختبار مؤقتة";
fixture.profile.bio = "إثبات بقاء محتوى البورتفوليو بعد النسخ والاستعادة.";
/** Escapes generated fixture values for explicit PostgreSQL test statements. */
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const fixtureJson = literal(JSON.stringify(fixture));
let fixtureCreated = false;
try {
	if (verify) {
		await command([
			"psql",
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			`
   BEGIN;
   INSERT INTO "user"(id,name,email) VALUES (${literal(fixtureUser)},'Restore fixture',${literal(`restore-${fixtureUser}@example.com`)});
   INSERT INTO sites(id,owner_id,slug,draft) VALUES (${literal(fixtureSite)},${literal(fixtureUser)},${literal(`restore-${fixtureSite}`)},${fixtureJson}::jsonb);
   INSERT INTO releases(id,site_id,revision,snapshot) VALUES (${literal(fixtureRelease)},${literal(fixtureSite)},0,${fixtureJson}::jsonb);
   UPDATE sites SET published_release_id=${literal(fixtureRelease)} WHERE id=${literal(fixtureSite)};
   INSERT INTO admin_audit(id,actor_id,action,target_type,target_id,request_id,reason) VALUES (${literal(newId())},${literal(fixtureUser)},'site.suspend','site',${literal(fixtureSite)},'restore-fixture','Restore verification');
   UPDATE sites SET suspended=true,suspension_reason='Restore verification' WHERE id=${literal(fixtureSite)};
   COMMIT;`,
		]);
		fixtureCreated = true;
	}
	try {
		const dump = Bun.spawn(["pg_dump", "--format=custom", "--no-owner"], {
			env: environment,
			stdout: handle.fd,
			stderr: "pipe",
		});
		await new Response(dump.stderr).text();
		if ((await dump.exited) !== 0)
			throw new Error("Database backup failed; no successful backup claimed");
	} finally {
		await handle.close();
	}
	console.info(JSON.stringify({ event: "backup_created", file }));
	if (verify) {
		const restoreName = `folio_restore_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
		await command(["createdb", restoreName], { PGDATABASE: "postgres" });
		try {
			await command([
				"pg_restore",
				"--exit-on-error",
				"--no-owner",
				`--dbname=${restoreName}`,
				file,
			]);
			for (const table of [
				"user",
				"account",
				"session",
				"verification",
				"sites",
				"releases",
				"assets",
				"inquiries",
				"rate_buckets",
				"rate_limit",
				"admin_audit",
				"two_factor",
			]) {
				const query = `select count(*)::integer from "${table}"`;
				const before = await command(["psql", "-At", "-v", "ON_ERROR_STOP=1", "-c", query]);
				const after = await command(["psql", "-At", "-v", "ON_ERROR_STOP=1", "-c", query], {
					PGDATABASE: restoreName,
				});
				if (before.out !== after.out) throw new Error(`Restore count mismatch: ${table}`);
			}
			for (const query of [
				`select suspended::text || suspension_reason from sites where id=${literal(fixtureSite)}`,
				`select action || reason from admin_audit where actor_id=${literal(fixtureUser)}`,
				`select draft::text from sites where id=${literal(fixtureSite)}`,
				`select snapshot::text from releases where id=${literal(fixtureRelease)}`,
				`select published_release_id::text from sites where id=${literal(fixtureSite)}`,
			]) {
				const before = await command(["psql", "-At", "-v", "ON_ERROR_STOP=1", "-c", query]);
				const after = await command(["psql", "-At", "-v", "ON_ERROR_STOP=1", "-c", query], {
					PGDATABASE: restoreName,
				});
				if (!before.out.trim() || before.out !== after.out)
					throw new Error("Restored portfolio fixture does not match source");
			}
			const trigger = await command(
				[
					"psql",
					"-At",
					"-c",
					"select count(*) from pg_trigger where tgname='release_snapshot_immutable'",
				],
				{ PGDATABASE: restoreName },
			);
			if (trigger.out.trim() !== "1")
				throw new Error("Restore missing release immutability trigger");
			console.info(
				JSON.stringify({
					event: "restore_verified",
					tables: 12,
					immutableTrigger: true,
					portfolioContent: true,
					publishedPointer: true,
				}),
			);
		} finally {
			await command(["dropdb", restoreName], { PGDATABASE: "postgres" });
		}
	}
} finally {
	if (fixtureCreated)
		await command([
			"psql",
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			`DELETE FROM admin_audit WHERE actor_id=${literal(fixtureUser)}; DELETE FROM "user" WHERE id=${literal(fixtureUser)}`,
		]);
}
