import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { envSchema } from "../src/config/env";
import { db } from "../src/db";
import { adminAudit } from "../src/db/schema/admin";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { inquiries, rateBuckets } from "../src/db/schema/operations";
import { releases, sites } from "../src/db/schema/site";
import { auth } from "../src/lib/auth";
import * as auditWriter from "../src/services/admin/audit-service";
import { passwordFailures } from "../src/services/admin/password-failures";
import { account, error, request, result } from "./helpers";

const ids: string[] = [];
afterAll(async () => {
	await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
	await db.delete(user).where(inArray(user.id, ids));
});
async function fixture(role = "user") {
	const actor = await account("round2", ids);
	if (role !== "user") await db.update(user).set({ role }).where(eq(user.id, actor.id));
	return {
		...actor,
		headers: new Headers({ Cookie: actor.cookie, Origin: "http://localhost:3000" }),
	};
}
test("failure limiter is shared across account/site actions, blocks correct passwords and expires independently", async () => {
	const actor = await fixture("owner"),
		member = await fixture();
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `limit-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const base = `/api/admin/users/${member.id}`;
	const paths = [
		`${base}/ban`,
		`${base}/reveal-email`,
		`/api/admin/sites/${site.id}/suspend`,
		`${base}/unban`,
		`${base}/remove`,
	];
	for (const path of paths)
		await error(
			await request(
				path,
				"POST",
				{
					reason: "Failure budget fixture",
					password: "Wrong-password-123",
					...(path.endsWith("remove") ? { confirmation: member.id } : {}),
				},
				actor.cookie,
			),
			400,
			"INVALID_PASSWORD",
		);
	const key = passwordFailures.key(actor.id);
	const [blocked] = await db.select().from(rateBuckets).where(eq(rateBuckets.key, key));
	expect(blocked.count).toBe(5);
	expect(blocked.expiresAt.getTime() - Date.now()).toBeGreaterThan(890000);
	await error(
		await request(
			`${base}/reveal-email`,
			"POST",
			{ reason: "Correct but locked", password: actor.password },
			actor.cookie,
		),
		429,
		"ADMIN_PASSWORD_BLOCKED",
	);
	expect(
		(await db.select().from(rateBuckets).where(eq(rateBuckets.key, key)))[0].expiresAt,
	).toEqual(blocked.expiresAt);
	const generalKey = createHash("sha256").update(`private-write:${actor.id}`).digest("hex");
	expect(
		(await db.select().from(rateBuckets).where(eq(rateBuckets.key, generalKey)))[0].count,
	).toBe(6);
	// HTTP keeps the ordinary budget; internal verification never consumes it.
	await db
		.update(rateBuckets)
		.set({ expiresAt: new Date(Date.now() - 1000) })
		.where(eq(rateBuckets.key, key));
	await db.update(rateBuckets).set({ count: 120 }).where(eq(rateBuckets.key, generalKey));
	await auth.api.unbanUser({
		headers: actor.headers,
		body: {
			...{ userId: member.id, password: actor.password, reason: "Internal general independence" },
		},
	});
	expect(
		(await db.select().from(rateBuckets).where(eq(rateBuckets.key, generalKey)))[0].count,
	).toBe(120);
	await error(
		await request(
			`${base}/reveal-email`,
			"POST",
			{ reason: "General budget enforced", password: actor.password },
			actor.cookie,
		),
		429,
		"RATE_LIMITED",
	);
	await passwordFailures.fail(actor.id);
	expect((await db.select().from(rateBuckets).where(eq(rateBuckets.key, key)))[0].count).toBe(1);
	await db
		.update(rateBuckets)
		.set({ expiresAt: new Date(Date.now() - 1000) })
		.where(eq(rateBuckets.key, key));
	await passwordFailures.check(actor.id);
	await passwordFailures.fail(actor.id);
	expect((await db.select().from(rateBuckets).where(eq(rateBuckets.key, key)))[0].count).toBe(1);
});
test("reveal/removal role matrix, strict confirmation, protected targets and no email in audit", async () => {
	const member = await fixture();
	for (const role of ["owner", "moderator", "support", "analyst", "user", "admin", "unknown"]) {
		const actor = await fixture(role),
			data = { reason: "Reviewed ordinary account", password: actor.password };
		const reveal = await request(
			`/api/admin/users/${member.id}/reveal-email`,
			"POST",
			data,
			actor.cookie,
		);
		if (["owner", "support"].includes(role)) {
			expect((await result<{ email: string }>(reveal)).email).toBe(member.email);
			const masked = await result<{ email: string }>(
				await request(`/api/admin/users/${member.id}`, "GET", undefined, actor.cookie),
			);
			expect(masked.email).not.toBe(member.email);
		} else await error(reveal, 403);
		await error(
			await request(
				`/api/admin/users/${member.id}/remove`,
				"POST",
				{ ...data, confirmation: "wrong-id" },
				actor.cookie,
			),
			role === "owner" ? 400 : 403,
		);
		if (["owner", "support"].includes(role)) {
			for (const bad of [
				{ reason: data.reason },
				{ ...data, reason: "short" },
				{ ...data, reason: "x".repeat(501) },
				{ ...data, password: "wrong-password" },
				{ ...data, extra: true },
			])
				await error(
					await request(`/api/admin/users/${member.id}/reveal-email`, "POST", bad, actor.cookie),
					400,
				);
			for (const protectedRole of ["owner", "support", "user,moderator", "unknown", "admin"]) {
				const target = await fixture(protectedRole);
				await error(
					await request(`/api/admin/users/${target.id}/reveal-email`, "POST", data, actor.cookie),
					503,
					"ADMIN_ACTION_UNAVAILABLE",
				);
				if (role === "owner")
					await error(
						await request(
							`/api/admin/users/${target.id}/remove`,
							"POST",
							{ ...data, confirmation: target.id },
							actor.cookie,
						),
						503,
					);
			}
		}
		expect(
			JSON.stringify(await db.select().from(adminAudit).where(eq(adminAudit.actorId, actor.id))),
		).not.toContain(member.email);
	}
	await error(await request(`/api/admin/users/${member.id}/reveal-email`, "POST", {}), 401);
});
test("removal uses native cascades and email is withheld when success audit fails", async () => {
	const actor = await fixture("owner"),
		member = await fixture();
	const data = { reason: "Reviewed removal request", password: actor.password };
	const original = auditWriter.recordAdminAction;
	const writer = spyOn(auditWriter, "recordAdminAction").mockImplementation(async (...args) => {
		if (args[2] === "user.read_email" && args[1].status === "succeeded")
			throw new Error("Synthetic outcome failure");
		return original(...args);
	});
	try {
		const response = await request(
			`/api/admin/users/${member.id}/reveal-email`,
			"POST",
			data,
			actor.cookie,
		);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain(member.email);
	} finally {
		writer.mockRestore();
	}
	const site = await result<{ id: string }>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `remove-${crypto.randomUUID()}`, locale: "en" },
			member.cookie,
		),
	);
	const [stored] = await db.select().from(sites).where(eq(sites.id, site.id));
	await db.insert(releases).values({ siteId: site.id, revision: 0, snapshot: stored.draft });
	await db
		.insert(inquiries)
		.values({ siteId: site.id, name: "Fixture", email: member.email, message: "Fixture inquiry" });
	await db.insert(assets).values({
		siteId: site.id,
		uploaderId: member.id,
		key: `fixture/${crypto.randomUUID()}`,
		stagingKey: `fixture/${crypto.randomUUID()}`,
		mime: "image/png",
		size: 1,
		expiresAt: new Date(),
	});
	await result(
		await request(
			`/api/admin/users/${member.id}/remove`,
			"POST",
			{ ...data, confirmation: member.id },
			actor.cookie,
		),
	);
	expect(await db.select().from(user).where(eq(user.id, member.id))).toHaveLength(0);
	for (const table of [releases, inquiries, assets])
		expect(await db.select().from(table).where(eq(table.siteId, site.id))).toHaveLength(0);
	expect(await db.select().from(sites).where(eq(sites.id, site.id))).toHaveLength(0);
	const events = await db.select().from(adminAudit).where(eq(adminAudit.actorId, actor.id));
	expect(
		events
			.filter((r) => r.action === "user.remove")
			.map((r) => r.status)
			.sort(),
	).toEqual(["attempted", "succeeded"]);
	expect(JSON.stringify(events)).not.toContain(member.email);
});
test("password failure settings are bounded validated configuration", () => {
	const base = {
		DATABASE_URL: "postgresql://local",
		BETTER_AUTH_SECRET: "x".repeat(32),
		API_URL: "http://localhost:4000",
		WEB_URL: "http://localhost:3000",
	};
	expect(envSchema.parse(base).ADMIN_PASSWORD_MAX_FAILURES).toBe(5);
	for (const key of [
		"ADMIN_PASSWORD_MAX_FAILURES",
		"ADMIN_PASSWORD_WINDOW_SECONDS",
		"ADMIN_PASSWORD_BLOCK_SECONDS",
	]) {
		for (const value of ["0", "-1", "1.5", "invalid", "999999"])
			expect(envSchema.safeParse({ ...base, [key]: value }).success).toBe(false);
		expect(envSchema.parse({ ...base, [key]: "2" })[key as "ADMIN_PASSWORD_MAX_FAILURES"]).toBe(2);
	}
});
