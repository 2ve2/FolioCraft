import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";
import { env, envSchema } from "../src/config/env";
import { db, withRequestDatabase } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { systemNotices } from "../src/db/schema/notices";
import { csvCell, csvColumns } from "../src/services/admin/audit-export";
import * as auditWriter from "../src/services/admin/audit-service";
import { account, error, request, result } from "./helpers";

const ids: string[] = [],
	noticeIds: string[] = [];
afterAll(async () => {
	if (noticeIds.length) await db.delete(systemNotices).where(inArray(systemNotices.id, noticeIds));
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(user).where(inArray(user.id, ids));
	}
});
async function fixture(role: string) {
	const actor = await account(`operations-${role.replaceAll(",", "-")}`, ids);
	await db.update(user).set({ role }).where(eq(user.id, actor.id));
	return actor;
}
function notice(overrides: Record<string, unknown> = {}) {
	return {
		kind: "info",
		messageAr: "تنبيه اختبار محلي",
		messageEn: "Local test notice",
		startsAt: new Date(Date.now() - 60000).toISOString(),
		endsAt: new Date(Date.now() + 3600000).toISOString(),
		active: true,
		...overrides,
	};
}
const reason = "Local operations verification";
test("every new administrative endpoint follows the real role matrix and anonymous denial", async () => {
	const id = crypto.randomUUID();
	const paths = [
		["GET", "/system", "system"],
		["GET", "/overview", "common"],
		["GET", "/notices", "common"],
		["POST", "/notices", "manage"],
		["PATCH", `/notices/${id}`, "manage"],
		["POST", `/notices/${id}/disable`, "manage"],
		["POST", "/audit/export", "export"],
	] as const;
	for (const role of [
		"owner",
		"moderator",
		"support",
		"analyst",
		"user",
		"support,moderator",
		"admin",
	]) {
		const actor = await fixture(role);
		for (const [method, path, permission] of paths) {
			const allowed =
				role === "owner" ||
				(permission === "common" && !["user", "admin"].includes(role)) ||
				(role === "analyst" && ["system", "export"].includes(permission));
			const response = await request(
				`/api/admin${path}`,
				method,
				method === "GET" ? undefined : {},
				actor.cookie,
			);
			expect(response.status).toBe(allowed ? (method === "GET" ? 200 : 400) : 403);
			if (path === "/overview" && allowed) {
				const body = await response.json();
				expect(Boolean(body.result.system)).toBe(["owner", "analyst"].includes(role));
				expect(Boolean(body.result.recentEvents)).toBe(
					["owner", "analyst", "moderator", "support,moderator"].includes(role),
				);
			}
		}
	}
	for (const [method, path] of paths)
		expect(
			(await request(`/api/admin${path}`, method, method === "GET" ? undefined : {})).status,
		).toBe(401);
});
test("notice windows, activation, public minimization and audited create/edit/disable use real rows", async () => {
	const actor = await fixture("owner"),
		credentials = { reason, password: actor.password };
	const created = await result<{ id: string }>(
		await request("/api/admin/notices", "POST", { ...credentials, notice: notice() }, actor.cookie),
		201,
	);
	noticeIds.push(created.id);
	for (const extra of [
		{ active: false },
		{
			startsAt: new Date(Date.now() + 3600000).toISOString(),
			endsAt: new Date(Date.now() + 7200000).toISOString(),
		},
		{
			startsAt: new Date(Date.now() - 7200000).toISOString(),
			endsAt: new Date(Date.now() - 3600000).toISOString(),
		},
	]) {
		const row = await result<{ id: string }>(
			await request(
				"/api/admin/notices",
				"POST",
				{ ...credentials, notice: notice(extra) },
				actor.cookie,
			),
			201,
		);
		noticeIds.push(row.id);
	}
	const publicPage = await result<{ items: Record<string, unknown>[] }>(
		await request("/api/public/notices"),
	);
	expect(
		publicPage.items.filter((n) => noticeIds.includes(n.id as string)).map((n) => n.id),
	).toEqual([created.id]);
	const entry = publicPage.items.find((n) => n.id === created.id) ?? {};
	expect(Object.keys(entry).sort()).toEqual(
		["id", "kind", "messageAr", "messageEn", "startsAt", "endsAt"].sort(),
	);
	expect(JSON.stringify(entry)).not.toContain(actor.id);
	expect(JSON.stringify(entry)).not.toContain(reason);
	await result(
		await request(
			`/api/admin/notices/${created.id}`,
			"PATCH",
			{ ...credentials, notice: notice({ messageEn: "Edited local notice" }) },
			actor.cookie,
		),
	);
	expect(
		(
			await result<{ items: { messageEn: string }[] }>(await request("/api/public/notices"))
		).items.some((n) => n.messageEn === "Edited local notice"),
	).toBe(true);
	await result(
		await request(`/api/admin/notices/${created.id}/disable`, "POST", credentials, actor.cookie),
	);
	expect(
		(await result<{ items: { id: string }[] }>(await request("/api/public/notices"))).items.some(
			(n) => n.id === created.id,
		),
	).toBe(false);
	const events = await db
		.select()
		.from(adminAudit)
		.where(and(eq(adminAudit.targetId, created.id), eq(adminAudit.action, "notice.manage")));
	expect(events.length).toBe(6);
	for (const id of new Set(events.map((e) => e.requestId)))
		expect(
			events
				.filter((e) => e.requestId === id)
				.map((e) => e.status)
				.sort(),
		).toEqual(["attempted", "succeeded"]);
	for (const invalid of [
		notice({ messageAr: "" }),
		notice({ endsAt: new Date(Date.now() - 7200000).toISOString() }),
		notice({ kind: "unknown" }),
		notice({ messageEn: "a".repeat(1001) }),
	])
		await error(
			await request(
				"/api/admin/notices",
				"POST",
				{ ...credentials, notice: invalid },
				actor.cookie,
			),
			400,
		);
	await error(
		await request(
			"/api/admin/notices",
			"POST",
			{ ...credentials, password: "wrong-password", notice: notice() },
			actor.cookie,
		),
		400,
		"INVALID_PASSWORD",
	);
});
test("notice attempts fail closed, success audit failure rolls back and request pool max1 completes", async () => {
	const actor = await fixture("owner"),
		credentials = { reason, password: actor.password };
	const original = auditWriter.recordAdminAction;
	let fail: "attempted" | "succeeded" = "attempted";
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
		if (args[2] === "notice.manage" && args[1].status === fail)
			throw new Error("Synthetic audit sink failure");
		return original(...args);
	});
	const unique = `notice-${crypto.randomUUID()}`;
	try {
		for (const phase of ["attempted", "succeeded"] as const) {
			fail = phase;
			expect(
				(
					await request(
						"/api/admin/notices",
						"POST",
						{ ...credentials, notice: notice({ messageEn: unique }) },
						actor.cookie,
					)
				).status,
			).toBe(503);
			expect(
				(await db.select().from(systemNotices).where(eq(systemNotices.messageEn, unique))).length,
			).toBe(0);
		}
	} finally {
		writer.mockRestore();
	}
	const row = await withRequestDatabase(async () =>
		result<{ id: string }>(
			await request(
				"/api/admin/notices",
				"POST",
				{ ...credentials, notice: notice({ messageEn: unique }) },
				actor.cookie,
			),
			201,
		),
	);
	noticeIds.push(row.id);
});
test("CSV enforces limits, excludes contact/reasons/metadata and requires durable success", async () => {
	const actor = await fixture("analyst"),
		credentials = { reason, password: actor.password };
	const correlation = crypto.randomUUID();
	await auditWriter.recordAdminAction(
		db,
		{
			actorId: actor.id,
			requestId: correlation,
			reason: "Private free text email@example.com",
			status: "attempted",
		},
		"site.suspend",
		"site",
		"=DANGEROUS",
		{ secret: "never-export", suspended: true },
	);
	await auditWriter.recordAdminAction(
		db,
		{ actorId: actor.id, requestId: correlation, status: "failed" },
		"site.suspend",
		"site",
		"=DANGEROUS",
	);
	const filters = {
		requestId: correlation,
		actorId: actor.id,
		action: "site.suspend",
		targetType: "site",
		targetId: "=DANGEROUS",
		from: new Date(Date.now() - 60000).toISOString(),
		to: new Date(Date.now() + 60000).toISOString(),
	};
	const csv = await request(
		"/api/admin/audit/export",
		"POST",
		{ ...credentials, filters, maxRows: 1 },
		actor.cookie,
	);
	expect(csv.status).toBe(200);
	expect(csv.headers.get("Content-Type")).toContain("text/csv");
	const content = await csv.text();
	expect(content.trim().split("\r\n").length).toBe(2);
	expect(content.split("\r\n")[0]).toBe(csvColumns.map(csvCell).join(","));
	for (const secret of [
		"email@example.com",
		"Private free text",
		"never-export",
		"metadata",
		"password",
	])
		expect(content).not.toContain(secret);
	expect(content).toContain("'=DANGEROUS");
	const page = await result<{ items: { metadata: Record<string, unknown> }[] }>(
		await request(
			`/api/admin/audit?${new URLSearchParams(filters)}`,
			"GET",
			undefined,
			actor.cookie,
		),
	);
	expect(page.items.length).toBe(2);
	expect(page.items.some((e) => e.metadata.suspended === true)).toBe(true);
	expect(JSON.stringify(page)).not.toContain("never-export");
	for (const maxRows of [0, env.ADMIN_AUDIT_EXPORT_MAX_ROWS + 1])
		await error(
			await request(
				"/api/admin/audit/export",
				"POST",
				{ ...credentials, filters: {}, maxRows },
				actor.cookie,
			),
			400,
		);
	await error(
		await request(
			"/api/admin/audit/export",
			"POST",
			{ ...credentials, filters: { email: "forbidden" }, maxRows: 1 },
			actor.cookie,
		),
		400,
	);
	for (const phase of ["attempted", "succeeded"]) {
		const original = auditWriter.recordAdminAction,
			writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
				if (args[2] === "audit.export" && args[1].status === phase)
					throw new Error("Synthetic export audit failure");
				return original(...args);
			});
		try {
			const response = await request(
				"/api/admin/audit/export",
				"POST",
				{ ...credentials, filters: {}, maxRows: 1 },
				actor.cookie,
			);
			expect(response.status).toBe(503);
			expect(response.headers.get("Content-Type")).not.toContain("text/csv");
		} finally {
			writer.mockRestore();
		}
	}
	const events = await db
		.select()
		.from(adminAudit)
		.where(and(eq(adminAudit.actorId, actor.id), eq(adminAudit.action, "audit.export")));
	expect(events.some((e) => e.status === "succeeded")).toBe(true);
});
test("system flags disclose no settings and upload counters are observed schema states", async () => {
	const actor = await fixture("owner"),
		member = await fixture("user");
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `system-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const baseline = await result<{ expiredPendingUploads: number; stuckDeletingUploads: number }>(
		await request("/api/admin/system", "GET", undefined, actor.cookie),
	);
	for (const status of ["pending", "deleting"] as const) {
		await db.insert(assets).values({
			siteId: site.id,
			uploaderId: member.id,
			key: crypto.randomUUID(),
			stagingKey: crypto.randomUUID(),
			mime: "image/png",
			size: 1,
			status,
			expiresAt: new Date(Date.now() - 3600000),
			updatedAt: new Date(Date.now() - 3600000),
		});
	}
	const state = await result<Record<string, unknown>>(
		await request("/api/admin/system", "GET", undefined, actor.cookie),
	);
	expect(state.expiredPendingUploads).toBe(baseline.expiredPendingUploads + 1);
	expect(state.stuckDeletingUploads).toBe(baseline.stuckDeletingUploads + 1);
	expect(state.failedUploadEvents).toBeNull();
	expect(state.migrationCount).toBe(8);
	for (const value of Object.values(state.configuration as Record<string, unknown>))
		expect(typeof value).toBe("boolean");
	const serialized = JSON.stringify(state);
	for (const secret of [
		env.DATABASE_URL,
		env.BETTER_AUTH_SECRET,
		env.REPORT_IP_SALT ?? "not-configured",
	])
		expect(serialized).not.toContain(secret);
});
test("CSV neutralizes formula cells, metadata is finite, and configurable limits are bounded", () => {
	for (const value of ["=1+1", " +SUM(A1)", "\t@cmd", "-12"]) {
		expect(csvCell(value)).toStartWith("\"'");
	}
	expect(csvCell('hello,"world"')).toBe('"hello,""world"""');
	expect(
		auditWriter.sanitizeAuditMetadata({
			password: "secret",
			code: "bad@email.com",
			operation: "disable",
			suspended: true,
			rows: 2,
		}),
	).toEqual({ operation: "disable", suspended: true, rows: 2 });
	for (const limit of [0, 10001, "invalid"]) {
		expect(
			envSchema.safeParse({
				...env,
				ADMIN_AUDIT_EXPORT_MAX_ROWS: limit,
				ADMIN_REQUIRE_MFA: "false",
				TRIAL_SKIP_EMAIL_VERIFICATION: "false",
				SMTP_SECURE: "false",
			}).success,
		).toBe(false);
	}
});
