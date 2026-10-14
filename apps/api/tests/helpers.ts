import "./test-guard";
import { expect } from "bun:test";
import app from "../src/app";
import { env } from "../src/config/env";

export async function request(
	path: string,
	method = "GET",
	body?: unknown,
	cookie?: string,
	clientIp?: string,
) {
	return app.request(new URL(path, env.API_URL).href, {
		method,
		headers: {
			Origin: env.WEB_URL,
			...(clientIp ? { "x-folio-client-ip": clientIp } : {}),
			...(body === undefined ? {} : { "Content-Type": "application/json" }),
			...(cookie ? { Cookie: cookie } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}
export async function result<T>(response: Response, status = 200): Promise<T> {
	expect(response.status).toBe(status);
	const data = (await response.json()) as { status: boolean; result: T };
	expect(data.status).toBe(true);
	return data.result;
}
export async function error(response: Response, status: number, code?: string) {
	expect(response.status).toBe(status);
	const body = (await response.json()) as { status?: boolean; code: string };
	if (body.status !== undefined) expect(body.status).toBe(false);
	if (code !== undefined) expect(body.code).toBe(code);
}
export async function account(label: string, ids: string[]) {
	const unique = crypto.randomUUID();
	const email = `folio-${label}-${unique}@example.com`;
	const response = await request(
		"/api/auth/sign-up/email",
		"POST",
		{
			name: `Integration ${label}`,
			email,
			password: `Portfolio-${unique}`,
		},
		undefined,
		`127.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
	);
	expect(response.status).toBe(200);
	const body = (await response.json()) as { user: { id: string } };
	ids.push(body.user.id);
	const cookie = response.headers
		.getSetCookie()
		.map((value) => value.split(";")[0])
		.join("; ");
	expect(cookie).toContain("session_token=");
	return { id: body.user.id, email, cookie };
}
