import { describe, expect, test } from "bun:test";
import {
	monitoringEnabled,
	monitoringOptions,
	scrubEvent,
	sendDefaultPii,
} from "@ichnara/monitoring";

const release = "11111111-2222-4333-8444-555555555555";
const base = { release, tags: { worker: "api", kind: "unhandled" } };

describe("outgoing error privacy allowlist", () => {
	test("removes private fields, including future nested SDK fields and error text", () => {
		const privateValues = {
			cookie: "session=private-session-cookie",
			authorization: "Bearer private-auth-token",
			email: "private.person@example.invalid",
			ip: "203.0.113.77",
			ipv6: "2001:db8::1234",
			query: "https://api.example.invalid/reset/private-path-token?token=private-reset-token",
			verification: "https://api.example.invalid/verify-email?token=private-verification-token",
			draft: "PRIVATE unpublished portfolio text",
		};
		const event = {
			...base,
			message: JSON.stringify(privateValues),
			request: { headers: privateValues, cookies: privateValues.cookie, data: privateValues },
			user: privateValues,
			extra: privateValues,
			contexts: { futureSdkField: privateValues },
			breadcrumbs: [{ data: privateValues }],
			transaction: privateValues.query,
			server_name: privateValues.ip,
			exception: { values: [{ value: privateValues.draft, stacktrace: privateValues }] },
			tags: { ...base.tags, arbitrary: privateValues.draft },
			futureSdkField: privateValues,
		};
		const output = scrubEvent(event, {
			originalException: new Error(JSON.stringify(privateValues)),
		});
		expect(output).not.toBeNull();
		expect(output?.environment).toBe("trial");
		expect(output?.release).toBe(release);
		for (const value of Object.values(privateValues))
			expect(JSON.stringify(output)).not.toContain(value);
		expect(Object.keys(output ?? {}).sort()).toEqual([
			"environment",
			"exception",
			"fingerprint",
			"level",
			"message",
			"platform",
			"release",
			"tags",
			"type",
		]);
	});
	test("does not call user serializers or getters", () => {
		const poison = () => {
			throw new Error("Never inspect sensitive getters");
		};
		const event = { ...base, toJSON: poison };
		Object.defineProperty(event, "request", { get: poison });
		expect(scrubEvent(event)).not.toBeNull();
	});
	test("retains only static bundle coordinates, without stack messages or source context", () => {
		const output = scrubEvent({
			...base,
			exception: {
				values: [
					{
						type: "TypeError",
						value: "PRIVATE_DRAFT",
						stacktrace: {
							frames: [
								{
									filename: "https://private@example.invalid/worker.js",
									lineno: 12,
									colno: 34,
									function: "PRIVATE_DRAFT",
									pre_context: ["private@example.invalid"],
									vars: { cookie: "secret" },
								},
								{ filename: "worker.js?token=private-reset-token", lineno: 1, colno: 2 },
								{ filename: "private@example.invalid", lineno: 1, colno: 2 },
							],
						},
					},
				],
			},
		});
		expect(output?.exception.values[0]?.stacktrace?.frames).toEqual([
			{ filename: "worker.js", lineno: 12, colno: 34 },
		]);
		for (const value of [
			"PRIVATE_DRAFT",
			"private@example.invalid",
			"private-reset-token",
			"secret",
		])
			expect(JSON.stringify(output)).not.toContain(value);
	});
	test("drops 4xx and non-error telemetry, forged tags and missing release identity", () => {
		for (const status of [400, 401, 403, 404, 422, 429]) {
			expect(scrubEvent(base, { originalException: { status } })).toBeNull();
			expect(scrubEvent(base, { originalException: { statusCode: status } })).toBeNull();
			expect(
				scrubEvent({ ...base, tags: { ...base.tags, http_status: String(status) } }),
			).toBeNull();
		}
		for (const type of ["transaction", "profile", "log", "replay_event"])
			expect(scrubEvent({ ...base, type })).toBeNull();
		for (const release of [undefined, "unknown", "private.person@example.invalid", "draft"])
			expect(scrubEvent({ ...base, release })).toBeNull();
		expect(scrubEvent({ ...base, tags: { worker: "private", kind: "unhandled" } })).toBeNull();
		expect(scrubEvent({ ...base, tags: { worker: "api", kind: "draft" } })).toBeNull();
	});
	test("keeps only fixed HTTP/Cron grouping and a generated event id", () => {
		const output = scrubEvent({
			...base,
			event_id: "a".repeat(32),
			tags: { worker: "web", kind: "http_5xx", http_status: "503" },
		});
		expect(output?.tags).toEqual({ worker: "web", kind: "http_5xx", http_status: "503" });
		expect(output?.event_id).toBe("a".repeat(32));
		expect(scrubEvent({ ...base, tags: { worker: "api", kind: "cron_failed" } })?.message).toBe(
			"Scheduled maintenance failed",
		);
	});
	test("has no capture without secret and actual version; disables every other telemetry type", () => {
		expect(monitoringEnabled({ CF_VERSION_METADATA: { id: release } })).toBe(false);
		expect(monitoringEnabled({ SENTRY_DSN: "synthetic-test-value" })).toBe(false);
		const bindings = {
			SENTRY_DSN: "https://synthetic@o0.ingest.sentry.io/1",
			CF_VERSION_METADATA: { id: release },
		};
		expect(monitoringEnabled(bindings)).toBe(true);
		expect(sendDefaultPii).toBe(false);
		expect(monitoringOptions(bindings, "api")).toMatchObject({
			enabled: true,
			environment: "trial",
			release,
			dataCollection: {
				userInfo: false,
				cookies: false,
				httpHeaders: false,
				httpBodies: [],
				urlQueryParams: false,
			},
			defaultIntegrations: false,
			integrations: [],
			tracesSampleRate: 0,
			sendClientReports: false,
			maxBreadcrumbs: 0,
			sampleRate: 1,
			tracePropagationTargets: [],
		});
		const options = monitoringOptions(bindings, "api");
		expect(options.beforeSendLog()).toBeNull();
		expect(options.beforeSendMetric()).toBeNull();
		expect(options.ignoreSpans[0]?.test("every span")).toBe(true);
	});
});
