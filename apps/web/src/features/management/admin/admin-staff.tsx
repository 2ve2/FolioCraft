"use client";
import type { Permission, PlatformRole } from "@ichnara/contracts/admin-policy";
import { date } from "../shared";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { ReadState } from "./admin-directory";
import { useAdminData } from "./admin-query";
import fields from "./operations.module.css";
import layout from "./reports.module.css";
import { requestsCopy } from "./requests-copy";

type Staff = {
	items: {
		id: string;
		name: string;
		roles: PlatformRole[];
		mfaEnrolled: boolean;
		lastAuditAt: string | null;
	}[];
	truncated: boolean;
	matrix: Record<PlatformRole, Permission[]>;
};
/** Shows only authoritative read-only grants and safe staff metadata, with no mutation control. */
export function AdminStaff() {
	const { locale } = useAdminSession(),
		t = requestsCopy[locale],
		state = useAdminData<Staff>("/api/admin/staff", locale);
	const roles = ["owner", "moderator", "support", "analyst"] as const;
	const permissions = [...new Set(roles.flatMap((role) => state.data?.matrix[role] ?? []))].sort();
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t.staff}</h1>
			<p>{t.staffIntro}</p>
			<ReadState state={state}>{null}</ReadState>
			{state.data?.truncated && <p role="status">{t.truncated}</p>}
			{state.data?.items.map((person) => (
				<article className={styles.card} key={person.id}>
					<h2 dir="auto">{person.name}</h2>
					<p>
						<bdi>{person.id}</bdi>
					</p>
					<p>
						{t.role}: <bdi>{person.roles.join(", ")}</bdi>
					</p>
					<p>
						{t.mfa}: {person.mfaEnrolled ? t.allowed : t.denied}
					</p>
					<p>
						{t.lastAudit}: {person.lastAuditAt ? date(person.lastAuditAt, locale) : t.none}
					</p>
				</article>
			))}
			<h2>{t.matrix}</h2>
			{permissions.map((permission) => (
				<article className={styles.card} key={permission}>
					<h3 dir="ltr">{permission}</h3>
					{roles.map((role) => (
						<p key={role}>
							<bdi>{role}</bdi>:{" "}
							{state.data?.matrix[role].includes(permission) ? t.allowed : t.denied}
						</p>
					))}
				</article>
			))}
		</section>
	);
}
