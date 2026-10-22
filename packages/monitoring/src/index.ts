export type MonitoringBindings = {
	SENTRY_DSN?: string;
	CF_VERSION_METADATA?: { id: string };
};
export type WorkerName = "api" | "web";
// SDK 11 replaces sendDefaultPii with dataCollection; keep the explicit policy here.
export const sendDefaultPii = false;
const versionPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const kinds = ["unhandled", "http_5xx", "cron_failed"] as const;
const errorTypes = [
	"Error",
	"TypeError",
	"RangeError",
	"SyntaxError",
	"ReferenceError",
	"URIError",
];

/** Returns only an actual Workers version identifier; never invents a deployment release. */
export function deployedVersion(bindings: MonitoringBindings) {
	const id = bindings.CF_VERSION_METADATA?.id;
	return typeof id === "string" && versionPattern.test(id) ? id : undefined;
}

/** Disables the entire capture boundary unless its secret and deployment identity are present. */
export function monitoringEnabled(bindings: MonitoringBindings) {
	if (!bindings.SENTRY_DSN || !deployedVersion(bindings)) return false;
	try {
		const dsn = new URL(bindings.SENTRY_DSN);
		return (
			dsn.protocol === "https:" &&
			/^o\d+\.ingest(?:\.(?:us|de))?\.sentry\.io$/.test(dsn.hostname) &&
			/^[a-z0-9]+$/i.test(dsn.username) &&
			/^\/\d+$/.test(dsn.pathname) &&
			!dsn.password &&
			!dsn.port &&
			!dsn.search &&
			!dsn.hash
		);
	} catch {
		return false;
	}
}

/** Reads plain fields without serializing errors, arbitrary objects or user-controlled getters. */
function field(value: unknown, key: string): unknown {
	if (!value || typeof value !== "object") return undefined;
	const property = Object.getOwnPropertyDescriptor(value, key);
	return property && "value" in property ? property.value : undefined;
}

/** Rebuilds events from a finite allowlist; unknown SDK/context fields cannot leave the Worker. */
export function scrubEvent(event: unknown, hint?: unknown) {
	const tags = field(event, "tags");
	const worker = field(tags, "worker");
	const kind = field(tags, "kind");
	const release = field(event, "release");
	const original = field(hint, "originalException");
	const values = field(field(event, "exception"), "values");
	const exception = field(values, "0");
	const status = field(tags, "http_status");
	const originalStatus = field(original, "status") ?? field(original, "statusCode");
	if (
		(typeof originalStatus === "number" && originalStatus >= 400 && originalStatus < 500) ||
		(typeof status === "string" && /^4\d\d$/.test(status)) ||
		(worker !== "api" && worker !== "web") ||
		!kinds.includes(kind as (typeof kinds)[number]) ||
		typeof release !== "string" ||
		!versionPattern.test(release) ||
		field(event, "type") !== undefined
	)
		return null;
	const httpStatus = typeof status === "string" && /^5\d\d$/.test(status) ? status : undefined;
	const name = field(original, "name") ?? field(exception, "type");
	const errorType = typeof name === "string" && errorTypes.includes(name) ? name : "Error";
	const message =
		kind === "cron_failed" ? "Scheduled maintenance failed" : "Server operation failed";
	const eventId = field(event, "event_id");
	const rawFrames = field(field(exception, "stacktrace"), "frames");
	const frames: { filename: string; lineno: number; colno: number }[] = [];
	if (Array.isArray(rawFrames)) {
		for (let index = Math.max(0, rawFrames.length - 12); index < rawFrames.length; index++) {
			const frame = field(rawFrames, String(index));
			const filename = field(frame, "filename");
			const basename = typeof filename === "string" ? filename.split("/").at(-1) : undefined;
			const lineno = field(frame, "lineno");
			const colno = field(frame, "colno");
			if (
				basename &&
				/^(worker|worker-monitoring|handler)\.(js|mjs)$/.test(basename) &&
				typeof lineno === "number" &&
				Number.isInteger(lineno) &&
				lineno > 0 &&
				lineno < 10_000_000 &&
				typeof colno === "number" &&
				Number.isInteger(colno) &&
				colno > 0 &&
				colno < 10_000_000
			)
				frames.push({ filename: basename, lineno, colno });
		}
	}
	return {
		type: undefined,
		...(typeof eventId === "string" && /^[a-f0-9]{32}$/.test(eventId) ? { event_id: eventId } : {}),
		environment: "trial",
		release,
		platform: "javascript",
		level: "error" as const,
		message,
		exception: {
			values: [
				{ type: errorType, value: message, ...(frames.length ? { stacktrace: { frames } } : {}) },
			],
		},
		tags: { worker, kind: String(kind), ...(httpStatus ? { http_status: httpStatus } : {}) },
		fingerprint: [
			worker,
			String(kind),
			httpStatus ?? errorType,
			...frames.map((frame) => `${frame.filename}:${frame.lineno}:${frame.colno}`),
		],
	};
}

/** Uses errors only: no request context, spans, replay, profiling, logs or client reports. */
export function monitoringOptions(bindings: MonitoringBindings, worker: WorkerName) {
	return {
		dsn: bindings.SENTRY_DSN,
		enabled: monitoringEnabled(bindings),
		environment: "trial",
		release: deployedVersion(bindings),
		dataCollection: {
			userInfo: sendDefaultPii,
			cookies: false,
			httpHeaders: false,
			httpBodies: [],
			urlQueryParams: false,
			databaseQueryData: false,
			queues: false,
			stackFrameVariables: false,
			frameContextLines: 0,
			graphQL: { document: false, variables: false },
			genAI: { inputs: false, outputs: false },
		},
		defaultIntegrations: false as const,
		integrations: [],
		tracesSampleRate: 0,
		beforeSendLog: () => null,
		beforeSendMetric: () => null,
		ignoreSpans: [/.*/],
		cacheClient: false,
		enableOpenTelemetrySetup: false,
		sendClientReports: false,
		tracePropagationTargets: [],
		maxBreadcrumbs: 0,
		sampleRate: 1,
		initialScope: { tags: { worker, kind: "unhandled" } },
		beforeSend: scrubEvent,
	};
}
