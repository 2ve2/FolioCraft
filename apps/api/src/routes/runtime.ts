import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { integrationStatus } from "../config/env";
import { db } from "../db";

export const runtimeRoutes = new Hono();

/** Reports that the HTTP process can respond without requiring external providers. */
runtimeRoutes.get("/health", (c) => c.json({ status: true }));

/** Checks database reachability and reports honestly which optional integrations are configured. */
runtimeRoutes.get("/ready", async (c) => {
	try {
		await db.execute(sql`select 1`);
		return c.json({ status: true, integrations: integrationStatus });
	} catch {
		return c.json({ status: false, code: "DATABASE_UNAVAILABLE" }, 503);
	}
});
