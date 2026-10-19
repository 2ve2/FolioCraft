import "../test-guard";
import { chmod } from "node:fs/promises";
import { collectAssetIds, draftSchema } from "@ichnara/contracts";
import { eq, inArray } from "drizzle-orm";
import app from "../../src/app";
import { db, pool } from "../../src/db";
import { adminAudit } from "../../src/db/schema/admin";
import { user } from "../../src/db/schema/auth";

const ids: string[] = [];
const nonce = crypto.randomUUID();
const password = `Browser-fixture-${nonce}`;
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 4400,
	fetch: (request, instance) => {
		const headers = new Headers(request.headers);
		headers.set("x-folio-client-ip", instance.requestIP(request)?.address ?? "unknown");
		return app.fetch(new Request(request, { headers }));
	},
});

/** Creates only uniquely named disposable identities on guarded local folio_test. */
async function account(label: string, name: string) {
	const email = `browser-${label}-${nonce}@example.com`;
	const response = await app.request("http://127.0.0.1:4400/api/auth/sign-up/email", {
		method: "POST",
		headers: { Origin: "http://127.0.0.1:4300", "Content-Type": "application/json" },
		body: JSON.stringify({ name, email, password }),
	});
	if (response.status !== 200) throw new Error(`Fixture signup failed: ${response.status}`);
	const body = await response.json();
	ids.push(body.user.id);
	return {
		id: body.user.id as string,
		email,
		cookie: response.headers
			.getSetCookie()
			.map((value) => value.split(";")[0])
			.join("; "),
	};
}

/** Dispatches seed operations through the real application protocol. */
async function domain(path: string, method: string, body: unknown, cookie: string) {
	const response = await app.request(`http://127.0.0.1:4400${path}`, {
		method,
		headers: {
			Origin: "http://127.0.0.1:4300",
			"Content-Type": "application/json",
			Cookie: cookie,
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error(`Fixture setup failed: ${path} ${response.status}`);
	return (await response.json()).result;
}

/** Stops services and deletes only this run's generated fixtures and audit events. */
async function cleanup() {
	await server.stop(true);
	if (ids.length) {
		const events = await db
			.select({
				action: adminAudit.action,
				status: adminAudit.status,
				targetType: adminAudit.targetType,
				reason: adminAudit.reason,
			})
			.from(adminAudit)
			.where(inArray(adminAudit.actorId, ids));
		await Bun.write(
			new URL("../../../../work/admin-browser-qa/database-evidence.json", import.meta.url),
			JSON.stringify({ events }),
		);
		await db.delete(adminAudit).where(inArray(adminAudit.actorId, ids));
		await db.delete(user).where(inArray(user.id, ids));
	}
	const remaining = ids.length
		? await db.select({ id: user.id }).from(user).where(inArray(user.id, ids))
		: [];
	await Bun.write(
		new URL("../../../../work/admin-browser-qa/cleanup.json", import.meta.url),
		JSON.stringify({ deletedFixtureUsers: ids.length, remainingFixtureUsers: remaining.length }),
	);
	const credentialsFile = Bun.file(
		new URL("../../../../work/admin-browser-qa/credentials.json", import.meta.url),
	);
	if (await credentialsFile.exists()) await credentialsFile.delete();
	await pool.end();
}

try {
	const sourcePath = process.env.FOLIO_BROWSER_DRAFT_FILE;
	const sourceDraft = sourcePath ? draftSchema.parse(await Bun.file(sourcePath).json()) : null;
	if (sourceDraft && collectAssetIds(sourceDraft).length)
		throw new Error("Browser fixture must not reuse another site's assets");
	const admin = await account("admin", "مسؤول تجربة الواجهة — QA administrator");
	const owner = await account(
		"owner",
		"اسم طويل لاختبار المحاذاة والتفاف النص العربي مع English mixed content",
	);
	await db.update(user).set({ role: "owner" }).where(eq(user.id, admin.id));
	let site = await domain(
		"/api/sites",
		"POST",
		{ slug: `browser-qa-${nonce}`, locale: "ar" },
		owner.cookie,
	);
	site = await domain(
		`/api/sites/${site.id}/draft`,
		"PUT",
		{
			revision: site.revision,
			draft: sourceDraft ?? {
				...site.draft,
				profile: {
					...site.draft.profile,
					name: "بيانات قبول معزولة",
					role: "مصمم منتجات — Product designer",
					bio: "هذه بيانات اختبار مؤقتة في قاعدة PostgreSQL المحلية فقط.",
				},
			},
		},
		owner.cookie,
	);
	await domain(`/api/sites/${site.id}/releases`, "POST", { revision: site.revision }, owner.cookie);
	let englishSite: { id: string; slug: string } | undefined;
	if (process.env.FOLIO_REPORT_BROWSER === "true") {
		const englishOwner = await account("report-en", "Temporary English report fixture");
		let english = await domain(
			"/api/sites",
			"POST",
			{ slug: `report-en-${nonce}`, locale: "en" },
			englishOwner.cookie,
		);
		english = await domain(
			`/api/sites/${english.id}/draft`,
			"PUT",
			{
				revision: english.revision,
				draft: {
					...english.draft,
					profile: { ...english.draft.profile, name: "Report browser fixture", role: "Designer" },
				},
			},
			englishOwner.cookie,
		);
		await domain(
			`/api/sites/${english.id}/releases`,
			"POST",
			{ revision: english.revision },
			englishOwner.cookie,
		);
		englishSite = { id: english.id, slug: english.slug };
	}
	const credentials = new URL(
		"../../../../work/admin-browser-qa/credentials.json",
		import.meta.url,
	);
	await Bun.write(
		credentials,
		JSON.stringify({
			admin: { id: admin.id, email: admin.email },
			owner: { id: owner.id, email: owner.email },
			password,
			site: { id: site.id, slug: site.slug },
			englishSite,
		}),
	);
	await chmod(credentials, 0o600);
	console.info(
		"Isolated real admin API ready: localhost:4400; disposable credentials stored privately.",
	);
	await new Promise<void>((resolve) => {
		process.on("SIGINT", resolve);
		process.on("SIGTERM", resolve);
	});
} finally {
	await cleanup();
}
