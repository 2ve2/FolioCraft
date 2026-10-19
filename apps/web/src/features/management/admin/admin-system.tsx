"use client";
import Link from "next/link";
import styles from "./admin.module.css";
import { type AuditEvent, AuditEvents } from "./admin-activity";
import { useAdminSession } from "./admin-context";
import { ReadState, useAdminData } from "./admin-directory";
import { directoryCopy } from "./directory-copy";
import fields from "./operations.module.css";
import { operationsCopy } from "./operations-copy";
import layout from "./reports.module.css";
export type SystemState = {
	configuration: Record<"smtp" | "storage" | "reportIpSalt" | "mfaEnforced", boolean>;
	expiredPendingUploads: number;
	stuckDeletingUploads: number;
	failedUploadEvents: null;
	openReports: number;
	buildVersion: string;
	migrationCount: number;
	auditExportMaxRows: number;
};
function SystemDetails({ data }: { data: SystemState }) {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale],
		d = directoryCopy[locale];
	return (
		<>
			<h2>{t.configuration}</h2>
			<dl className={styles.detailsList}>
				{(Object.keys(data.configuration) as (keyof SystemState["configuration"])[]).map((key) => (
					<div key={key}>
						<dt>{t[key]}</dt>
						<dd>{data.configuration[key] ? d.yes : d.no}</dd>
					</div>
				))}
			</dl>
			<dl className={styles.detailsList}>
				{(
					[
						"expiredPendingUploads",
						"stuckDeletingUploads",
						"openReports",
						"migrationCount",
						"buildVersion",
					] as const
				).map((key) => (
					<div key={key}>
						<dt>{t[key]}</dt>
						<dd>{data[key] === "unknown" ? t.unknown : data[key]}</dd>
					</div>
				))}
				<div>
					<dt>{t.failedUploadEvents}</dt>
					<dd>{t.unavailable}</dd>
				</div>
			</dl>
			<p>{t.uploadHelp}</p>
		</>
	);
}
export function AdminSystem() {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale],
		state = useAdminData<SystemState>("/api/admin/system", locale);
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t.system}</h1>
			<ReadState state={state}>{state.data && <SystemDetails data={state.data} />}</ReadState>
		</section>
	);
}
type Overview = {
	requests?: { open: number; overdue: number };
	accounts?: { total: number; banned: number };
	sites?: { total: number; published: number; suspended: number };
	reports?: { open: number; reviewing: number };
	notices?: { current: number };
	auditAttention?: { unresolved: number };
	recentEvents?: AuditEvent[];
	system?: SystemState;
};
/** Renders only sections actually returned under the actor's authoritative permissions. */
export function AdminDashboard() {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale],
		state = useAdminData<Overview>("/api/admin/overview", locale),
		data = state.data;
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t.overview}</h1>
			<ReadState state={state}>
				<dl className={styles.stats}>
					{(["accounts", "sites", "reports", "notices"] as const).map(
						(section) =>
							data?.[section] && (
								<div className={styles.stat} key={section}>
									<dt>{t[section]}</dt>
									{Object.entries(data[section] ?? {}).map(([key, value]) => (
										<dd key={key}>
											{t[key as "total"] ?? key}: {value}
										</dd>
									))}
								</div>
							),
					)}
				</dl>
				<section className={styles.card}>
					<h2>{t.attention}</h2>
					{data?.reports && (
						<p>
							<Link href={`/admin/reports?lang=${locale}`}>
								{t.open}: {data.reports.open} · {t.reviewing}: {data.reports.reviewing}
							</Link>
						</p>
					)}
					{data?.requests && (
						<p>
							<Link href={`/admin/requests?lang=${locale}`}>
								{t.requests}: {data.requests.open} · {t.overdue}: {data.requests.overdue}
							</Link>
						</p>
					)}
					{data?.sites && (
						<p>
							<Link href={`/admin/sites?lang=${locale}`}>
								{t.suspended}: {data.sites.suspended}
							</Link>
						</p>
					)}
					{data?.auditAttention && (
						<p>
							{t.unresolved}: {data.auditAttention.unresolved}
						</p>
					)}
					{data?.system && (
						<>
							<p>
								{t.expiredPendingUploads}: {data.system.expiredPendingUploads}
							</p>
							<p>
								{t.stuckDeletingUploads}: {data.system.stuckDeletingUploads}
							</p>
						</>
					)}
				</section>
				{data?.recentEvents && (
					<section>
						<h2>{t.events}</h2>
						<AuditEvents items={data.recentEvents} />
						<Link href={`/admin/activity?lang=${locale}`}>{t.activity}</Link>
					</section>
				)}
				<p>{t.later}</p>
			</ReadState>
		</section>
	);
}
