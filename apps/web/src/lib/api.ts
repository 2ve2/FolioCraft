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
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
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
	return data.result as T;
}
