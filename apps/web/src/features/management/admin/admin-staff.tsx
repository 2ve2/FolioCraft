"use client";
import type { Permission, PlatformRole } from "@ichnara/contracts/admin-policy";
import { Check, Minus, UserCog } from "lucide-react";
import { date } from "../shared";
import { useAdminSession } from "./admin-context";
import { actionLabel } from "./admin-copy";
import { RoleBadge } from "./admin-directory";
import { useAdminData } from "./admin-query";
import { directoryCopy } from "./directory-copy";
import { requestsCopy } from "./requests-copy";
import { Avatar, type Column, DataTable, PageHeader, Panel, StatusBadge, ui } from "./ui/console";

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
		d = directoryCopy[locale],
		state = useAdminData<Staff>("/api/admin/staff", locale);
	const roles = ["owner", "moderator", "support", "analyst"] as const;
	const permissions = [...new Set(roles.flatMap((role) => state.data?.matrix[role] ?? []))].sort();
	const table = { loaded: Boolean(state.data), error: state.error, reload: state.reload };
	const people: Column<Staff["items"][number]>[] = [
		{
			key: "name",
			header: t.name,
			primary: true,
			cell: (person) => (
				<div className={ui.primaryCell}>
					<Avatar name={person.name} />
					<div className={ui.primaryText}>
						<strong dir="auto">{person.name}</strong>
						<span className={ui.mono} dir="ltr">
							{person.id}
						</span>
					</div>
				</div>
			),
		},
		{
			key: "roles",
			header: t.role,
			cell: (person) => <RoleBadge role={person.roles.join(",")} locale={locale} />,
		},
		{
			key: "mfa",
			header: t.mfa,
			cell: (person) => (
				<StatusBadge tone={person.mfaEnrolled ? "success" : "warning"}>
					{person.mfaEnrolled ? t.mfaYes : t.mfaNo}
				</StatusBadge>
			),
		},
		{
			key: "audit",
			header: t.lastAudit,
			cell: (person) => (
				<span className={ui.muted}>
					{person.lastAuditAt ? date(person.lastAuditAt, locale) : t.none}
				</span>
			),
		},
	];
	const matrix: Column<string>[] = [
		{
			key: "permission",
			header: t.permission,
			primary: true,
			cell: (permission) => (
				<div className={ui.primaryText}>
					<strong>{actionLabel(permission, locale)}</strong>
					<span className={ui.mono} dir="ltr">
						{permission}
					</span>
				</div>
			),
		},
		...roles.map((role) => ({
			key: role,
			header: d.roles[role],
			align: "center" as const,
			cell: (permission: string) =>
				state.data?.matrix[role].includes(permission as Permission) ? (
					<Check className={ui.yes} size={18} aria-label={t.allowed} />
				) : (
					<Minus className={ui.no} size={18} aria-label={t.denied} />
				),
		})),
	];
	return (
		<section className={ui.page}>
			<PageHeader title={t.staff} description={t.staffIntro} />
			{state.data?.truncated && (
				<p className={ui.banner} data-tone="info" role="status">
					{t.truncated}
				</p>
			)}
			<Panel title={t.staff} padded={false}>
				<DataTable
					label={t.staff}
					columns={people}
					rows={state.data?.items ?? []}
					rowKey={(person) => person.id}
					state={table}
					locale={locale}
					empty={{ icon: UserCog }}
				/>
			</Panel>
			<Panel title={t.matrix} padded={false}>
				<DataTable
					label={t.matrix}
					columns={matrix}
					rows={permissions}
					rowKey={(permission) => permission}
					state={table}
					locale={locale}
				/>
			</Panel>
		</section>
	);
}
