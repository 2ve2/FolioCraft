import { isAPIError } from "better-auth/api";
import { auth } from "../../lib/auth";
import { ApiError } from "../../lib/response-helpers";
import { banSchema, sensitiveSchema, translateSensitiveError } from "./sensitive-action";

/** Projects only approved identity fields; native rows never reach the administration client. */
function accountView(user: {
	id: string;
	name: string;
	email: string;
	role?: string | null;
	banned?: boolean | null;
	emailVerified: boolean;
	createdAt: Date;
}) {
	const at = user.email.lastIndexOf("@");
	return {
		id: user.id,
		name: user.name,
		email: at > 0 ? `${user.email[0]}***${user.email.slice(at)}` : "***",
		role: user.role,
		banned: user.banned,
		emailVerified: user.emailVerified,
		createdAt: user.createdAt.toISOString(),
	};
}

/** Retains intentional native status codes while keeping internal protocol messages private. */
async function nativeRead<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (isAPIError(error)) {
			if (error.statusCode === 404) throw new ApiError(404, "NOT_FOUND");
			if (error.statusCode === 401) throw new ApiError(401, "UNAUTHORIZED");
			if (error.statusCode === 403) throw new ApiError(403, "PERMISSION_DENIED");
			if (error.statusCode === 429) throw new ApiError(429, "RATE_LIMITED");
		}
		throw error;
	}
}

export const adminUserService = {
	/** Sends only server-built expanded native bodies; hooks own credentials, target checks and audits. */
	async mutate(
		headers: Headers,
		id: string,
		operation: "ban" | "unban" | "revoke-sessions" | "revoke-session",
		input: unknown,
		sessionId?: string,
	) {
		const data = (operation === "ban" ? banSchema : sensitiveSchema).parse(input);
		const body = { ...data, userId: id };
		try {
			if (operation === "ban") await auth.api.banUser({ headers, body });
			else if (operation === "unban") await auth.api.unbanUser({ headers, body });
			else if (operation === "revoke-sessions")
				await auth.api.revokeUserSessions({ headers, body });
			else
				await auth.api.revokeUserSession({
					headers,
					body: { ...body, sessionId } as unknown as { sessionToken: string },
				});
			return { success: true };
		} catch (error) {
			translateSensitiveError(error);
		}
	},
	/** Calls native read hooks internally and masks every email before serializing the bounded page. */
	async list(headers: Headers, limit: number, offset: number) {
		const result = await nativeRead(() =>
			auth.api.listUsers({
				headers,
				query: { limit, offset, sortBy: "createdAt", sortDirection: "desc" },
			}),
		);
		return {
			items: result.users.map(accountView),
			hasMore: offset + result.users.length < result.total,
			limit,
			offset,
		};
	},
	/** Reads a single native identity without leaking contact credentials or native adapter fields. */
	async get(headers: Headers, id: string) {
		return accountView(await nativeRead(() => auth.api.getUser({ headers, query: { id } })));
	},
	/** Lists session metadata without tokens, cookies, client IP or user-agent information. */
	async sessions(headers: Headers, userId: string) {
		const result = await nativeRead(() => auth.api.listUserSessions({ headers, body: { userId } }));
		return {
			items: result.sessions.slice(0, 100).map((session) => ({
				id: session.id,
				createdAt: session.createdAt.toISOString(),
				expiresAt: session.expiresAt.toISOString(),
			})),
		};
	},
};
