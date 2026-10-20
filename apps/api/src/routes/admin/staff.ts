import { isStaff, parseRoles, rolePermissions } from "@ichnara/contracts/admin-policy";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { binaryText } from "../../db/keyset";
import { adminAudit } from "../../db/schema/admin";
import { user } from "../../db/schema/auth";
import { successResponse } from "../../lib/response-helpers";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
export const adminStaffRoutes = new Hono<AuthEnv>();
adminStaffRoutes.get("/staff", requirePermission("staff", "read"), async (c) => {
	const rows = await db
		.select({
			id: user.id,
			name: user.name,
			role: user.role,
			mfaEnrolled: user.twoFactorEnabled,
			lastAuditAt: sql<
				string | null
			>`(select max(${adminAudit.createdAt}) from ${adminAudit} where ${adminAudit.actorId} = ${sql.raw('"user"."id"')})`,
		})
		.from(user)
		.where(
			sql`exists(select 1 from unnest(string_to_array(coalesce(${user.role}, ''), ',')) r where trim(r) in ('owner','moderator','support','analyst'))`,
		)
		.orderBy(binaryText(user.id))
		.limit(1001);
	return successResponse(c, {
		items: rows
			.slice(0, 1000)
			.filter((row) => isStaff(row.role))
			.map((row) => ({ ...row, roles: parseRoles(row.role) })),
		truncated: rows.length > 1000,
		matrix: rolePermissions,
	});
});
