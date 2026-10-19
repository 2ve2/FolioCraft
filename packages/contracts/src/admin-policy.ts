/** Defines product permissions without importing server code or dependency-specific auth state. */
export const adminStatements = {
	user: [
		"read",
		"read_email",
		"ban",
		"unban",
		"revoke_session",
		"impersonate",
		"set_role",
		"remove",
		"set_password",
	],
	site: ["read", "read_draft", "suspend", "resume"],
	report: ["read", "handle"],
	request: ["read", "handle", "export"],
	notice: ["read", "manage"],
	audit: ["read", "export"],
	system: ["read"],
	staff: ["read", "manage"],
	note: ["read", "write"],
} as const;
export type AdminResource = keyof typeof adminStatements;
export type AdminAction<R extends AdminResource> = (typeof adminStatements)[R][number];
export type Permission = { [R in AdminResource]: `${R}.${AdminAction<R>}` }[AdminResource];
export const staffRoles = ["owner", "moderator", "support", "analyst"] as const;
export type StaffRole = (typeof staffRoles)[number];
export type PlatformRole = StaffRole | "user";

const common: Permission[] = ["user.read", "site.read", "report.read", "notice.read"];
export const rolePermissions: Record<PlatformRole, readonly Permission[]> = {
	owner: Object.entries(adminStatements)
		.flatMap(([resource, actions]) =>
			actions.map((action) => `${resource}.${action}` as Permission),
		)
		.filter((permission) => !["user.impersonate", "user.set_password"].includes(permission)),
	moderator: [
		...common,
		"site.suspend",
		"site.resume",
		"report.handle",
		"audit.read",
		"note.read",
		"note.write",
	],
	support: [
		...common,
		"user.read_email",
		"user.ban",
		"user.unban",
		"user.revoke_session",
		"request.read",
		"request.handle",
		"note.read",
		"note.write",
	],
	analyst: [...common, "audit.read", "audit.export", "system.read"],
	user: [],
};

/** Reads only known roles; legacy admin is deliberately not an alias or authority. */
export function parseRoles(value: unknown): PlatformRole[] {
	if (typeof value !== "string") return [];
	return [
		...new Set(
			value
				.split(",")
				.map((role) => role.trim())
				.filter((role): role is PlatformRole => Object.hasOwn(rolePermissions, role)),
		),
	];
}

/** Supplies the same role membership policy to server hooks and Studio entry points. */
export function isStaff(value: unknown): boolean {
	return parseRoles(value).some((role) => role !== "user");
}

/** Computes grants from the shared matrix; unknown roles and actions never grant access. */
export function permissionsFor(value: unknown): Permission[] {
	return [...new Set(parseRoles(value).flatMap((role) => rolePermissions[role]))];
}

/** Evaluates one explicit product permission independently of client visibility. */
export function hasPermission<R extends AdminResource>(
	value: unknown,
	resource: R,
	action: AdminAction<R>,
): boolean {
	return permissionsFor(value).includes(`${resource}.${action}` as Permission);
}

/** Keeps page/navigation visibility derived from server-delivered permissions. */
export function canViewAdmin(
	permissions: readonly Permission[],
	view: "overview" | "sites" | "users" | "audit" | "reports" | "system" | "notices",
): boolean {
	return permissions.includes(
		view === "system"
			? "system.read"
			: view === "notices"
				? "notice.read"
				: view === "reports"
					? "report.read"
					: view === "sites"
						? "site.read"
						: view === "audit"
							? "audit.read"
							: "user.read",
	);
}

export type AdminPermissions = { permissions: Permission[]; roles: PlatformRole[] };
