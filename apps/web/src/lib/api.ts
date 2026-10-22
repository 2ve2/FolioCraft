import { apiOrigin } from "./api-origin";

export { apiOrigin } from "./api-origin";
export { authClient } from "./auth-client";
export class ApiError extends Error {
	constructor(
		public code: string,
		message: string,
		public status: number,
	) {
		super(message);
	}
}

/** Sends credentialed domain requests and preserves stable server failure codes. */
export async function apiEnvelope<T>(
	path: string,
	method = "GET",
	body?: unknown,
): Promise<{ result: T; sessionIdentity?: unknown }> {
	let response: Response;
	try {
		response = await fetch(`${apiOrigin}${path}`, {
			method,
			credentials: "include",
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
			cache: "no-store",
		});
	} catch {
		throw new ApiError("UNAVAILABLE", "API unavailable", 0);
	}
	const data = await response.json().catch(() => null);
	if (!response.ok || !data?.status)
		throw new ApiError(
			data?.code || "REQUEST_FAILED",
			typeof data?.error === "string" ? data.error : "Request failed",
			response.status,
		);
	return { result: data.result as T, sessionIdentity: data.sessionIdentity };
}

/** Keeps existing callers on the unchanged domain-result contract. */
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
	return (await apiEnvelope<T>(path, method, body)).result;
}
