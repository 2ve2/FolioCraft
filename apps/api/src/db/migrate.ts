import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

await migrate(db, { migrationsFolder: "./src/db/migrations" });
await pool.end();
console.info("Migrations applied");
