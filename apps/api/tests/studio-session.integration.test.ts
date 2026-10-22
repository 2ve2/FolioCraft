import "./test-guard";
import { afterAll, expect, test } from "bun:test";
import { type Site, studioSessionSchema } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { session as authSessions, user } from "../src/db/schema/auth";
import { account, request, result } from "./helpers";

const created: string[] = [];
afterAll(async () => {
	if (created.length) await db.delete(user).where(inArray(user.id, created));
});

test("private site envelopes bind only the requesting user and native session, including empty sites", async () => {
	const first = await account("studio-first", created);
	const second = await account("studio-second", created);
	const site = await result<Site>(
		await request(
			"/api/sites",
			"POST",
			{ slug: `bound-${crypto.randomUUID()}`, locale: "en" },
			first.cookie,
		),
	);
	for (const owner of [first, second]) {
		const sessions = await db
			.select({ id: authSessions.id })
			.from(authSessions)
			.where(eq(authSessions.userId, owner.id));
		expect(sessions.length).toBe(1);
		const response = await request("/api/sites", "GET", undefined, owner.cookie);
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toContain("no-store");
		const body = await response.json();
		expect(body.status).toBe(true);
		if (owner === first) {
			expect(body.result.id === site.id).toBe(true);
			expect(Object.hasOwn(body.result, "sessionIdentity")).toBe(false);
			expect(Object.hasOwn(body.result, "userId")).toBe(false);
			expect(Object.hasOwn(body.result, "sessionId")).toBe(false);
		} else expect(body.result === null).toBe(true);
		expect(studioSessionSchema.safeParse(body.sessionIdentity).success).toBe(true);
		expect(body.sessionIdentity.userId === owner.id).toBe(true);
		expect(body.sessionIdentity.sessionId === sessions[0].id).toBe(true);
		expect(Object.keys(body.sessionIdentity).sort()).toEqual(["sessionId", "userId"]);
		expect(Object.keys(body).sort()).toEqual(["result", "sessionIdentity", "status"]);
	}
});

test("signed-out owned-site requests remain unauthorized without session metadata", async () => {
	const response = await request("/api/sites");
	expect(response.status).toBe(401);
	const body = await response.json();
	expect(body.code).toBe("UNAUTHORIZED");
	expect(Object.hasOwn(body, "sessionIdentity")).toBe(false);
});
