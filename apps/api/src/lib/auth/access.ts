import {
	adminStatements,
	type PlatformRole,
	rolePermissions,
} from "@ichnara/contracts/admin-policy";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

export const accessControl = createAccessControl({
	...defaultStatements,
	...adminStatements,
	user: [...new Set([...defaultStatements.user, ...adminStatements.user])],
});

/** Derives native grants from the shared product matrix, preserving Better Auth action names. */
function createRole(role: PlatformRole) {
	const grants: Record<string, string[]> = {};
	for (const permission of rolePermissions[role]) {
		const [resource, action] = permission.split(".");
		grants[resource] ??= [];
		grants[resource].push(action);
	}
	grants.user ??= [];
	const user = grants.user;
	grants.session ??= [];
	const session = grants.session;
	if (user.includes("read")) {
		user.push("list", "get");
		session.push("list");
	}
	if (user.includes("revoke_session")) session.push("revoke");
	if (user.includes("set_role")) user.push("set-role");
	if (user.includes("remove")) user.push("delete");
	return accessControl.newRole(grants as Parameters<typeof accessControl.newRole>[0]);
}
export const accessRoles = {
	owner: createRole("owner"),
	moderator: createRole("moderator"),
	support: createRole("support"),
	analyst: createRole("analyst"),
	user: createRole("user"),
};
