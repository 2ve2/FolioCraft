import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { env } from "../src/config/env";
import { db, withRequestDatabase } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { user } from "../src/db/schema/auth";
import { dataRequests } from "../src/db/schema/data-requests";
import { inquiries } from "../src/db/schema/operations";
import type { recordAdminAction } from "../src/services/admin/audit-service";
import * as auditWriter from "../src/services/admin/audit-service";
import { account, error, request, result } from "./helpers";

const ids: string[] = [],
	requestIds: string[] = [];
afterAll(async () => {
	if (requestIds.length) await db.delete(dataRequests).where(inArray(dataRequests.id, requestIds));
	if (ids.length) {
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(user).where(inArray(user.id, ids));
	}
});
const credentials = (actor: { password: string }) => ({
	password: actor.password,
	reason: "Handle isolated data rights fixture",
});
async function create(actor: Awaited<ReturnType<typeof account>>, type = "export") {
	const row = await result<{ id: string }>(
		await request(
			"/api/admin/requests",
			"POST",
			{ ...credentials(actor), request: { email: "contact-only@example.com", type } },
			actor.cookie,
		),
		201,
	);
	requestIds.push(row.id);
	return row.id;
}
test("P6 endpoint role matrix, strict filters and read-only staff projection", async () => {
	for (const role of ["owner", "support", "moderator", "analyst", "user"]) {
		const actor = await account(`rights-${role}`, ids);
		await db.update(user).set({ role }).where(eq(user.id, actor.id));
		const read = role === "owner" || role === "support";
		for (const path of ["/requests", `/requests/${crypto.randomUUID()}`]) {
			expect((await request(`/api/admin${path}`, "GET", undefined, actor.cookie)).status).toBe(
				read ? (path === "/requests" ? 200 : 404) : 403,
			);
		}
		const staff = await request("/api/admin/staff", "GET", undefined, actor.cookie);
		expect(staff.status).toBe(role === "owner" ? 200 : 403);
		if (role === "owner") {
			const text = await staff.text();
			expect(text).toContain("mfaEnrolled");
			expect(text).toContain("lastAuditAt");
			for (const key of ["email", "token", "password", "secret", "backupCodes"])
				expect(text).not.toContain(`"${key}"`);
		}
		for (const [path, method, body] of [
			[
				"/requests",
				"POST",
				{ ...credentials(actor), request: { email: actor.email, type: "correction" } },
			],
			[
				`/requests/${crypto.randomUUID()}/status`,
				"PATCH",
				{ ...credentials(actor), status: "in_progress" },
			],
			[
				`/requests/${crypto.randomUUID()}/subject`,
				"POST",
				{
					...credentials(actor),
					userId: "none",
					confirmation: "none",
					evidence: "Independent verification evidence",
				},
			],
			[`/requests/${crypto.randomUUID()}/export`, "POST", credentials(actor)],
		] as const) {
			const response = await request(`/api/admin${path}`, method, body, actor.cookie);
			const allowed = path.endsWith("/export") ? role === "owner" : read;
			expect(response.status).toBe(allowed ? (path === "/requests" ? 201 : 404) : 403);
			if (response.status === 201)
				requestIds.push((await result<{ id: string }>(response, 201)).id);
		}
		if (read)
			for (const query of ["search=contact", "email=contact-only@example.com", "sort=email"])
				await error(
					await request(`/api/admin/requests?${query}`, "GET", undefined, actor.cookie),
					400,
				);
	}
	for (const path of ["/requests", "/staff"])
		expect((await request(`/api/admin${path}`)).status).toBe(401);
});
test("request state machine, verified subject, bounded export privacy, durable attempts and max1", async () => {
	const owner = await account("rights-owner-main", ids),
		subject = await account("rights-subject", ids),
		other = await account("rights-other", ids);
	await db.update(user).set({ role: "owner" }).where(eq(user.id, owner.id));
	const id = await create(owner),
		cred = credentials(owner);
	const change = (status: string, notes?: string) =>
		request(
			`/api/admin/requests/${id}/status`,
			"PATCH",
			{ ...cred, status, ...(notes === undefined ? {} : { notes }) },
			owner.cookie,
		);
	const exportData = () => request(`/api/admin/requests/${id}/export`, "POST", cred, owner.cookie);
	await error(await change("completed", "Actual completion evidence"), 409);
	await error(await exportData(), 409, "REQUEST_SUBJECT_REQUIRED");
	await result(await change("in_progress"));
	await error(await change("received"), 409);
	await error(await change("rejected", "short"), 400);
	await error(
		await change("completed", "Actual completion evidence"),
		409,
		"REQUEST_SUBJECT_REQUIRED",
	);
	const verify = (userId: string, confirmation = userId) =>
		request(
			`/api/admin/requests/${id}/subject`,
			"POST",
			{
				...cred,
				userId,
				confirmation,
				evidence: "Verified via independent signed-in subject request reference QA-123",
			},
			owner.cookie,
		);
	await error(await verify(subject.id, other.id), 400, "CONFIRMATION_MISMATCH");
	await error(await verify(owner.id), 503, "ADMIN_ACTION_UNAVAILABLE");
	await result(await withRequestDatabase(() => verify(subject.id)));
	await error(await verify(other.id), 409);
	await error(
		await change("completed", "Actual completion evidence"),
		409,
		"REQUEST_EXPORT_REQUIRED",
	);
	const owned = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `rights-${crypto.randomUUID()}`, locale: "en" },
			subject.cookie,
		),
	);
	const foreign = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `rights-${crypto.randomUUID()}`, locale: "en" },
			other.cookie,
		),
	);
	await db.insert(inquiries).values([
		{
			siteId: owned.id,
			name: "Subject inquiry",
			email: "sender@example.com",
			message: "Only subject inbox message",
		},
		{
			siteId: foreign.id,
			name: "FOREIGN-INQUIRY",
			email: other.email,
			message: "PRIVATE-FOREIGN-MESSAGE",
		},
	]);
	const beforeRows = env.DATA_REQUEST_EXPORT_MAX_ROWS,
		beforeBytes = env.DATA_REQUEST_EXPORT_MAX_BYTES;
	try {
		env.DATA_REQUEST_EXPORT_MAX_ROWS = 2;
		await error(await exportData(), 413, "REQUEST_EXPORT_TOO_LARGE");
		env.DATA_REQUEST_EXPORT_MAX_ROWS = beforeRows;
		env.DATA_REQUEST_EXPORT_MAX_BYTES = 32;
		await error(await exportData(), 413);
		env.DATA_REQUEST_EXPORT_MAX_BYTES = beforeBytes;
		const output = await withRequestDatabase(exportData);
		expect(output.status).toBe(200);
		expect(output.headers.get("cache-control")).toContain("no-store");
		const text = await output.text(),
			json = JSON.parse(text);
		expect(json.account.id).toBe(subject.id);
		expect(json.account.email).toBe(subject.email);
		expect(json.sites.map((s: { id: string }) => s.id)).toEqual([owned.id]);
		expect(json.inquiries.length).toBe(1);
		for (const secret of [
			other.id,
			other.email,
			owner.password,
			subject.password,
			"PRIVATE-FOREIGN-MESSAGE",
			"FOREIGN-INQUIRY",
			'"draft"',
			'"snapshot"',
			'"token"',
			'"password"',
			'"secret"',
			'"adminTotpFactor"',
		])
			expect(text).not.toContain(secret);
		const originalWriter = auditWriter.recordAdminAction;
		const write = spyOn(auditWriter, "recordAdminAction").mockImplementation(
			async (...args: Parameters<typeof recordAdminAction>) => {
				if (args[1].status === "succeeded") throw new Error("synthetic outcome failure");
				return originalWriter(...args);
			},
		);
		try {
			const denied = await exportData();
			expect(denied.status).toBe(503);
			expect(await denied.text()).not.toContain(subject.email);
		} finally {
			write.mockRestore();
		}
		await result(
			await change(
				"completed",
				"Delivered generated export via verified channel QA-123; manual receipt recorded",
			),
		);
		await error(await change("in_progress"), 409);
		await error(await exportData(), 409);
	} finally {
		env.DATA_REQUEST_EXPORT_MAX_ROWS = beforeRows;
		env.DATA_REQUEST_EXPORT_MAX_BYTES = beforeBytes;
	}
	const rejected = await create(owner, "delete");
	await result(
		await request(
			`/api/admin/requests/${rejected}/status`,
			"PATCH",
			{ ...cred, status: "rejected", notes: "Subject could not be independently verified" },
			owner.cookie,
		),
	);
	await error(
		await request(
			`/api/admin/requests/${rejected}/status`,
			"PATCH",
			{ ...cred, status: "in_progress" },
			owner.cookie,
		),
		409,
	);
	const audit = await db.select().from(adminAudit).where(eq(adminAudit.targetId, id));
	expect(audit.some((r) => r.action === "request.export" && r.status === "succeeded")).toBe(true);
	expect(audit.filter((r) => r.status === "attempted").length).toBeGreaterThan(0);
	const fail = spyOn(auditWriter, "recordAdminAction").mockRejectedValue(
		new Error("synthetic attempt failure"),
	);
	try {
		await error(
			await request(
				"/api/admin/requests",
				"POST",
				{ ...cred, request: { email: "never-created@example.com", type: "export" } },
				owner.cookie,
			),
			503,
			"ADMIN_AUDIT_UNAVAILABLE",
		);
	} finally {
		fail.mockRestore();
	}
	expect(
		(
			await db
				.select()
				.from(dataRequests)
				.where(eq(dataRequests.email, "never-created@example.com"))
		).length,
	).toBe(0);
});

test("all request transitions are enforced and transactional audit failure rolls back writes", async () => {
	const actor = await account("rights-transitions", ids),
		subject = await account("rights-transition-subject", ids);
	await db.update(user).set({ role: "support" }).where(eq(user.id, actor.id));
	const allowed: Record<string, string[]> = {
		received: ["in_progress", "rejected"],
		in_progress: ["completed", "rejected"],
		completed: [],
		rejected: [],
	};
	for (const from of ["received", "in_progress", "completed", "rejected"] as const) {
		for (const to of ["received", "in_progress", "completed", "rejected"] as const) {
			const [row] = await db
				.insert(dataRequests)
				.values({
					email: "transition@example.com",
					type: "correction",
					status: from,
					userId: subject.id,
					subjectVerifiedAt: new Date(),
					subjectVerifiedBy: actor.id,
					dueAt: new Date(),
					notes: "Recorded independent verification evidence",
					completedAt: ["completed", "rejected"].includes(from) ? new Date() : null,
				})
				.returning();
			requestIds.push(row.id);
			const response = await request(
				`/api/admin/requests/${row.id}/status`,
				"PATCH",
				{
					...credentials(actor),
					status: to,
					notes: "Actual manual correction evidence reference QA-456",
				},
				actor.cookie,
			);
			expect(response.status, `${from} -> ${to}`).toBe(allowed[from].includes(to) ? 200 : 409);
		}
	}
	const id = await create(actor, "correction"),
		original = auditWriter.recordAdminAction;
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(
		async (...args: Parameters<typeof recordAdminAction>) => {
			if (args[1].status === "succeeded")
				throw new Error("synthetic transactional outcome failure");
			return original(...args);
		},
	);
	try {
		await error(
			await withRequestDatabase(() =>
				request(
					`/api/admin/requests/${id}/status`,
					"PATCH",
					{ ...credentials(actor), status: "in_progress" },
					actor.cookie,
				),
			),
			503,
			"ADMIN_AUDIT_UNAVAILABLE",
		);
	} finally {
		writer.mockRestore();
	}
	const [row] = await db.select().from(dataRequests).where(eq(dataRequests.id, id));
	expect(row.status).toBe("received");
	const events = await db.select().from(adminAudit).where(eq(adminAudit.targetId, id));
	expect(events.filter((r) => r.status === "failed").length).toBe(1);
	expect(events.filter((r) => r.status === "attempted").length).toBe(2);
});
