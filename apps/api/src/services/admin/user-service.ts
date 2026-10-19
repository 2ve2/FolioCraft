import { hasPermission } from "@ichnara/contracts/admin-policy";
import { isAPIError } from "better-auth/api";
import { and, asc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { user } from "../../db/schema/auth";
import { sites } from "../../db/schema/site";
import { auth } from "../../lib/auth";
import { ApiError } from "../../lib/response-helpers";
import {
	appendSensitiveOutcome,
	banSchema,
	prepareSensitiveAction,
	removeSchema,
	sensitiveSchema,
	translateSensitiveError,
} from "./sensitive-action";

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
	/** Releases the email only after durable success auditing, never through ordinary read DTOs. */
	async revealEmail(headers: Headers, id: string, input: unknown) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const { audit } = await prepareSensitiveAction(actor, headers, "user.read_email", id, input);
		let email: string;
		try {
			const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
			if (!target) throw new ApiError(404, "NOT_FOUND");
			email = target.email;
		} catch (error) {
			await appendSensitiveOutcome(audit, "failed");
			throw error;
		}
		await appendSensitiveOutcome(audit, "succeeded");
		return { email };
	},
	/** Sends only server-built expanded native bodies; hooks own credentials, target checks and audits. */
	async mutate(
		headers: Headers,
		id: string,
		operation: "ban" | "unban" | "revoke-sessions" | "revoke-session" | "remove",
		input: unknown,
		sessionId?: string,
	) {
		const data = (
			operation === "ban" ? banSchema : operation === "remove" ? removeSchema : sensitiveSchema
		).parse(input);
		const body = { ...data, userId: id };
		try {
			if (operation === "remove") await auth.api.removeUser({ headers, body });
			else if (operation === "ban") await auth.api.banUser({ headers, body });
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
	/** Uses the declared domain read permission and an ID keyset; never fetches private auth fields. */
	async list(
		headers: Headers,
		query: {
			limit: number;
			cursor?: string;
			search?: string;
			role?: string;
			banned?: boolean;
			verified?: boolean;
		},
	) {
		const actor = await auth.api.getSession({ headers });
		if (!actor) throw new ApiError(401, "UNAUTHORIZED");
		const canSearchEmail = hasPermission(actor.user.role, "user", "read_email");
		const rows = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				banned: user.banned,
				emailVerified: user.emailVerified,
				createdAt: user.createdAt,
				siteCount: sql<number>`(select count(*)::int from ${sites} where ${sites.ownerId} = ${sql.raw('"user"."id"')})`,
			})
			.from(user)
			.where(
				and(
					query.cursor ? gt(user.id, query.cursor) : undefined,
					query.search
						? or(
								ilike(user.name, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`),
								canSearchEmail
									? ilike(user.email, `%${query.search.replace(/[\\%_]/g, "\\$&")}%`)
									: undefined,
							)
						: undefined,
					query.role
						? sql`${query.role} = any(string_to_array(coalesce(${user.role}, 'user'), ','))`
						: undefined,
					query.banned === undefined
						? undefined
						: sql`coalesce(${user.banned}, false) = ${query.banned}`,
					query.verified === undefined ? undefined : eq(user.emailVerified, query.verified),
				),
			)
			.orderBy(asc(user.id))
			.limit(query.limit + 1);
		const items = rows
			.slice(0, query.limit)
			.map((row) => ({ ...accountView(row), siteCount: row.siteCount }));
		return { items, nextCursor: rows.length > query.limit ? items.at(-1)?.id : null };
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
