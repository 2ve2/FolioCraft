export type PoolStage = "request" | "scheduled" | "shared";

// Deliberately finite: unknown codes/names must never become an arbitrary log payload.
const codes = new Set([
	"08000",
	"08001",
	"08003",
	"08004",
	"08006",
	"08007",
	"08P01",
	"25006",
	"25P02",
	"25P03",
	"25P04",
	"28000",
	"28P01",
	"40001",
	"40P01",
	"53000",
	"53100",
	"53200",
	"53300",
	"53400",
	"57000",
	"57014",
	"57P01",
	"57P02",
	"57P03",
	"57P04",
	"57P05",
	"58000",
	"58030",
	"XX000",
	"ECONNABORTED",
	"ECONNREFUSED",
	"ECONNRESET",
	"EHOSTUNREACH",
	"ENETUNREACH",
	"ENOTFOUND",
	"EAI_AGAIN",
	"EPIPE",
	"ETIMEOUT",
	"ETIMEDOUT",
	"ERR_SOCKET_CLOSED",
	"ERR_STREAM_DESTROYED",
	"ERR_STREAM_PREMATURE_CLOSE",
]);
const names = new Set([
	"Error",
	"error",
	"TypeError",
	"RangeError",
	"AggregateError",
	"DatabaseError",
	"TimeoutError",
]);

/** Reads only plain diagnostic fields without invoking error getters or serializers. */
function field(error: unknown, key: "code" | "name"): unknown {
	if (!error || typeof error !== "object") return undefined;
	try {
		return Object.getOwnPropertyDescriptor(error, key)?.value;
	} catch {
		return undefined;
	}
}

/** Projects pool failures to fixed metadata; never serialize messages, SQL, clients or causes. */
export function poolErrorDiagnostic(
	error: unknown,
	stage: PoolStage,
	state: { ending: boolean; ended: boolean },
) {
	const code = field(error, "code");
	const name = field(error, "name");
	return {
		event: "database_pool_error",
		name:
			typeof name === "string" && names.has(name)
				? name
				: error instanceof Error
					? "Error"
					: "unknown",
		code: typeof code === "string" && codes.has(code) ? code : "unknown",
		stage,
		ending: state.ending,
		ended: state.ended,
	};
}
