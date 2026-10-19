import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import type { ContentReport, ReportPage, Site } from "@ichnara/contracts";
import { and, eq, inArray } from "drizzle-orm";
import app from "../src/app";
import { env, envSchema } from "../src/config/env";
import { db, withRequestDatabase } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { session, user } from "../src/db/schema/auth";
import { contentReports } from "../src/db/schema/reports";
import { sites } from "../src/db/schema/site";
import * as auditWriter from "../src/services/admin/audit-service";
import { reportIpHash, reportService } from "../src/services/reports";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];
afterAll(async () => {
	await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
	await db.delete(user).where(inArray(user.id, ids));
	expect(await db.select().from(user).where(inArray(user.id, ids))).toHaveLength(0);
});
async function fixture(role = "user") {
	const actor = await account("reports", ids);
	if (role !== "user") await db.update(user).set({ role }).where(eq(user.id, actor.id));
	return actor;
}
async function portfolio(published = true) {
	const owner = await fixture(),
		slug = `reports-${crypto.randomUUID()}`;
	let site = await result<Site>(
		await request("/api/sites", "POST", { slug, locale: "ar" }, owner.cookie),
	);
	if (published) {
		site = await result<Site>(
			await request(
				`/api/sites/${site.id}/draft`,
				"PUT",
				{
					revision: site.revision,
					draft: {
						...site.draft,
						profile: { ...site.draft.profile, name: "Report fixture", role: "Designer" },
					},
				},
				owner.cookie,
			),
		);
		await result(
			await request(
				`/api/sites/${site.id}/releases`,
				"POST",
				{ revision: site.revision },
				owner.cookie,
			),
		);
	}
	return { owner, site, slug, path: `/api/public/sites/${slug}/report` };
}
const data = {
	category: "spam",
	message: "Public report fixture",
	reporterEmail: "reporter@example.com",
};
function address() {
	return `127.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.8`;
}
async function intake(path: string, body: unknown = data, ip = address()) {
	return request(path, "POST", body, undefined, ip);
}
test("public reporting strictly validates size/input and only accepts accessible published sites", async () => {
	const p = await portfolio(),
		draft = await portfolio(false);
	for (const input of [
		{},
		{ ...data, category: "unknown" },
		{ ...data, message: "short" },
		{ ...data, message: "x".repeat(1001) },
		{ ...data, reporterEmail: "invalid" },
		{ ...data, siteId: p.site.id },
		{ ...data, reporterIpHash: "forged" },
	])
		await error(await intake(p.path, input), 400);
	await error(await intake(p.path, { ...data, message: "x".repeat(9000) }), 413, "BODY_TOO_LARGE");
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify({ ...data, message: "x".repeat(9000) })));
			c.close();
		},
	});
	const streamed = await app.request(`http://localhost:4000${p.path}`, {
		method: "POST",
		headers: {
			Origin: "http://localhost:3000",
			"Content-Type": "application/json",
			"x-folio-client-ip": address(),
		},
		body: stream,
	});
	expect(streamed.status).toBe(413);
	await error(await intake(draft.path), 404);
	await error(await intake(`/api/public/sites/missing-${crypto.randomUUID()}/report`), 404);
	await db.update(sites).set({ suspended: true }).where(eq(sites.id, p.site.id));
	await error(await intake(p.path), 404);
	await db.update(sites).set({ suspended: false }).where(eq(sites.id, p.site.id));
	await db.update(user).set({ banned: true }).where(eq(user.id, p.owner.id));
	await error(await intake(p.path), 404);
	await db.update(user).set({ banned: false }).where(eq(user.id, p.owner.id));
	await error(await intake(p.path, data, "unknown"), 400, "CLIENT_IP_REQUIRED");
	expect(await result(await intake(p.path), 201)).toEqual({ accepted: true });
	const ip = address();
	await result(
		await intake(p.path, { category: "other", message: "Optional contact omitted" }, ip),
		201,
	);
	const rows = await db.select().from(contentReports).where(eq(contentReports.siteId, p.site.id));
	expect(rows).toHaveLength(2);
	expect(rows.find((r) => r.reporterEmail === null)).toBeDefined();
	expect(JSON.stringify(rows)).not.toContain(ip);
	for (const row of rows) expect(row.reporterIpHash).toMatch(/^[a-f0-9]{64}$/);
	const noOrigin = await app.request(`http://localhost:4000${p.path}`, {
		method: "POST",
		body: JSON.stringify(data),
	});
	expect(noOrigin.status).toBe(403);
});
test("IP and site budgets are independent; duplicate suppression is concurrent and window-bounded", async () => {
	const p = await portfolio(),
		other = await portfolio(),
		ip = address();
	const responses = await Promise.all(
		Array.from({ length: 5 }, () => withRequestDatabase(() => intake(p.path, data, ip))),
	);
	for (const response of responses) expect(await result(response, 201)).toEqual({ accepted: true });
	expect(
		await db.select().from(contentReports).where(eq(contentReports.siteId, p.site.id)),
	).toHaveLength(1);
	await error(await intake(other.path, data, ip), 429, "RATE_LIMITED");
	// Same content from a different address is independently accepted.
	await result(await intake(p.path), 201);
	expect(
		await db.select().from(contentReports).where(eq(contentReports.siteId, p.site.id)),
	).toHaveLength(2);
	const expiredIp = address();
	await result(await intake(other.path, data, expiredIp), 201);
	await db
		.update(contentReports)
		.set({ createdAt: new Date(Date.now() - 301000) })
		.where(eq(contentReports.siteId, other.site.id));
	await result(await intake(other.path, data, expiredIp), 201);
	expect(
		await db.select().from(contentReports).where(eq(contentReports.siteId, other.site.id)),
	).toHaveLength(2);
	const siteLimited = await portfolio();
	for (let i = 0; i < 20; i++)
		await result(
			await intake(siteLimited.path, { ...data, message: `Independent site allowance ${i}` }),
			201,
		);
	await error(await intake(siteLimited.path), 429, "RATE_LIMITED");
	expect(reportIpHash("2001:db8::1")).toBe(reportIpHash("2001:0db8:0:0:0:0:0:1"));
	const previous = env.REPORT_IP_SALT;
	try {
		env.REPORT_IP_SALT = undefined;
		expect(() => reportIpHash(ip)).toThrow("REPORTING_UNAVAILABLE");
		env.REPORT_IP_SALT = "different-test-only-salt-at-least-32-characters";
		expect(reportIpHash(ip)).not.toBe(rowsHash(ip, previous));
	} finally {
		env.REPORT_IP_SALT = previous;
	}
});
function rowsHash(ip: string, salt: string | undefined) {
	const before = env.REPORT_IP_SALT;
	try {
		env.REPORT_IP_SALT = salt;
		return reportIpHash(ip);
	} finally {
		env.REPORT_IP_SALT = before;
	}
}
test("report endpoint matrix masks contact for every role and enforces terminal status transitions", async () => {
	const p = await portfolio();
	await result(await intake(p.path), 201);
	const [row] = await db.select().from(contentReports).where(eq(contentReports.siteId, p.site.id));
	for (const role of [
		"owner",
		"moderator",
		"support",
		"analyst",
		"user",
		"admin",
		"unknown",
		"support,moderator",
	]) {
		const actor = await fixture(role),
			read = ["owner", "moderator", "support", "analyst", "support,moderator"].includes(role),
			handle = ["owner", "moderator", "support,moderator"].includes(role);
		for (const path of ["/api/admin/reports", `/api/admin/reports/${row.id}`]) {
			const response = await request(path, "GET", undefined, actor.cookie);
			expect(response.status).toBe(read ? 200 : 403);
			const serialized = await response.text();
			expect(serialized).not.toContain(data.reporterEmail);
			expect(serialized).not.toContain(row.reporterIpHash);
			expect((await request(path, "HEAD", undefined, actor.cookie)).status).toBe(read ? 200 : 403);
		}
		const statusPath = `/api/admin/reports/${row.id}/status`;
		await db
			.update(contentReports)
			.set({ status: "open", handledBy: null, handledAt: null, resolutionNote: null })
			.where(eq(contentReports.id, row.id));
		const response = await request(statusPath, "POST", { status: "reviewing" }, actor.cookie);
		expect(response.status).toBe(handle ? 200 : 403);
		if (handle) {
			for (const input of [
				{ status: "open" },
				{ status: "dismissed" },
				{ status: "actioned", resolutionNote: "short" },
				{ status: "dismissed", resolutionNote: "x".repeat(501) },
				{ status: "reviewing", password: actor.password },
			])
				await error(await request(statusPath, "POST", input, actor.cookie), 400);
			const closed = await result<ContentReport>(
				await request(
					statusPath,
					"POST",
					{ status: "dismissed", resolutionNote: "  Reviewed and dismissed  " },
					actor.cookie,
				),
			);
			expect(closed.resolutionNote).toBe("Reviewed and dismissed");
			expect(closed.handledBy).toBe(actor.id);
			expect(closed.handledAt).not.toBeNull();
			await error(
				await request(statusPath, "POST", { status: "reviewing" }, actor.cookie),
				409,
				"REPORT_STATUS_CONFLICT",
			);
			const events = await db
				.select()
				.from(adminAudit)
				.where(and(eq(adminAudit.actorId, actor.id), eq(adminAudit.action, "report.handle")));
			expect(events.filter((r) => r.status === "attempted")).toHaveLength(3);
			expect(events.filter((r) => r.status === "succeeded")).toHaveLength(2);
			expect(events.filter((r) => r.status === "failed")).toHaveLength(1);
			expect(JSON.stringify(events)).not.toContain(data.reporterEmail);
		}
	}
	for (const [method, path, body] of [
		["GET", "/api/admin/reports", undefined],
		["GET", `/api/admin/reports/${row.id}`, undefined],
		["POST", `/api/admin/reports/${row.id}/status`, { status: "reviewing" }],
	] as const)
		await error(await request(path, method, body), 401);
});
test("oldest cursor/filter traversal is stable for equal timestamps and no offset is accepted", async () => {
	const p = await portfolio(),
		actor = await fixture("analyst");
	const moment = new Date(Date.now() - 600000);
	for (let i = 0; i < 6; i++)
		await db.insert(contentReports).values({
			siteId: p.site.id,
			category: i % 2 ? "other" : "spam",
			message: `Cursor report ${i}`,
			reporterIpHash: reportIpHash(address()),
			createdAt: new Date(moment.getTime() + Math.floor(i / 3) * 1000),
		});
	const expected = (await reportService.list({ limit: 100 })).items.map((r) => r.id),
		actual: string[] = [];
	let cursor: string | null = null;
	do {
		const page: ReportPage = await result<ReportPage>(
			await request(
				`/api/admin/reports?limit=2${cursor ? `&cursor=${cursor}` : ""}`,
				"GET",
				undefined,
				actor.cookie,
			),
		);
		actual.push(...page.items.map((r) => r.id));
		cursor = page.nextCursor;
	} while (cursor);
	expect(actual).toEqual(expected);
	expect(new Set(actual).size).toBe(actual.length);
	for (const query of [
		"cursor=invalid",
		"offset=0",
		"limit=101",
		"status=bad",
		"category=bad",
		"extra=1",
	])
		await error(await request(`/api/admin/reports?${query}`, "GET", undefined, actor.cookie), 400);
	const filtered = await result<ReportPage>(
		await request(
			"/api/admin/reports?status=open&category=spam&limit=100",
			"GET",
			undefined,
			actor.cookie,
		),
	);
	expect(filtered.items.every((r) => r.status === "open" && r.category === "spam")).toBe(true);
	expect(filtered.items.filter((r) => r.siteId === p.site.id)).toHaveLength(3);
});
test("status attempts fail closed and outcome rollback works in a single-connection request scope", async () => {
	const p = await portfolio(),
		actor = await fixture("owner");
	await intake(p.path);
	const [row] = await db.select().from(contentReports).where(eq(contentReports.siteId, p.site.id));
	const original = auditWriter.recordAdminAction;
	let failStatus = "attempted";
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
		if (args[2] === "report.handle" && args[1].status === failStatus)
			throw new Error("Synthetic report audit failure");
		return original(...args);
	});
	try {
		await error(
			await request(
				`/api/admin/reports/${row.id}/status`,
				"POST",
				{ status: "reviewing" },
				actor.cookie,
			),
			503,
			"ADMIN_AUDIT_UNAVAILABLE",
		);
		failStatus = "succeeded";
		await error(
			await withRequestDatabase(() =>
				request(
					`/api/admin/reports/${row.id}/status`,
					"POST",
					{ status: "reviewing" },
					actor.cookie,
				),
			),
			500,
		);
		expect(
			(await db.select().from(contentReports).where(eq(contentReports.id, row.id)))[0].status,
		).toBe("open");
	} finally {
		writer.mockRestore();
	}
	await result(
		await withRequestDatabase(() =>
			request(
				`/api/admin/reports/${row.id}/status`,
				"POST",
				{ status: "actioned", resolutionNote: "Action completed after review" },
				actor.cookie,
			),
		),
	);
	expect((await reportService.get(row.id)).status).toBe("actioned");
	await db.delete(session).where(eq(session.userId, actor.id));
	await error(await request(`/api/admin/reports/${row.id}`, "GET", undefined, actor.cookie), 401);
});
test("production salt configuration is required and invalid salts are rejected", () => {
	const base = {
		DATABASE_URL: "postgresql://local",
		BETTER_AUTH_SECRET: "x".repeat(32),
		API_URL: "https://api.example.com",
		WEB_URL: "https://example.com",
		TRIAL_SKIP_EMAIL_VERIFICATION: "true",
		NODE_ENV: "production",
	};
	for (const salt of [undefined, "", "short"])
		expect(envSchema.safeParse({ ...base, REPORT_IP_SALT: salt }).success).toBe(false);
	expect(envSchema.safeParse({ ...base, REPORT_IP_SALT: "x".repeat(32) }).success).toBe(true);
});
