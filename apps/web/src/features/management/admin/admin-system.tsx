"use client";
import { ChevronRight, Flag, Globe2, Inbox, Megaphone, UsersRound } from "lucide-react";
import Link from "next/link";
import { localeHref } from "../../../lib/locale";
import { type AuditEvent, EventTable } from "./admin-activity";
import { useAdminSession } from "./admin-context";
import { useAdminData } from "./admin-query";
import { operationsCopy } from "./operations-copy";
import { KeyValues, PageHeader, Panel, RecordState, StatCard, StatusBadge, ui } from "./ui/console";
import { consoleCopy } from "./ui/console-copy";

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

/** Configuration flags and upload maintenance counters, as the server reports them. */
export function AdminSystem() {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale],
		state = useAdminData<SystemState>("/api/admin/system", locale),
		data = state.data;
	return (
		<section className={ui.page}>
			<PageHeader title={t.system} description={t.systemIntro} />
			<RecordState state={state} locale={locale}>
				{data && (
					<div className={ui.grid2}>
						<div className={ui.stack}>
							<Panel title={t.configuration} padded={false}>
								<ul className={ui.list}>
									{(Object.keys(data.configuration) as (keyof SystemState["configuration"])[]).map(
										(key) => (
											<li key={key} className={ui.listRow}>
												<span>{t[key]}</span>
												<StatusBadge tone={data.configuration[key] ? "success" : "warning"}>
													{data.configuration[key] ? t.configured : t.notConfigured}
												</StatusBadge>
											</li>
										),
									)}
								</ul>
							</Panel>
							<Panel title={t.uploadMaintenance} description={t.uploadHelp} padded={false}>
								<ul className={ui.list}>
									{(["expiredPendingUploads", "stuckDeletingUploads", "openReports"] as const).map(
										(key) => (
											<li key={key} className={ui.listRow}>
												<span>{t[key]}</span>
												<span
													className={ui.count}
													data-tone={data[key] > 0 ? "warning" : undefined}
												>
													{data[key]}
												</span>
											</li>
										),
									)}
									<li className={ui.listRow}>
										<span>{t.failedUploadEvents}</span>
										<span className={ui.muted}>{t.unavailable}</span>
									</li>
								</ul>
							</Panel>
						</div>
						<Panel title={t.build}>
							<KeyValues
								items={[
									{
										label: t.buildVersion,
										value: data.buildVersion === "unknown" ? t.unknown : data.buildVersion,
										mono: data.buildVersion !== "unknown",
									},
									{ label: t.migrationCount, value: data.migrationCount },
									{ label: t.maxRows, value: data.auditExportMaxRows },
								]}
							/>
						</Panel>
					</div>
				)}
			</RecordState>
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

/** Platform totals, the items waiting for staff and recent audited events, per the actor's grants. */
export function AdminDashboard() {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale],
		c = consoleCopy[locale],
		state = useAdminData<Overview>("/api/admin/overview", locale),
		data = state.data;
	const href = (path: string) => localeHref(locale, path);
	const attention = data
		? [
				data.reports && {
					label: `${t.reports} · ${t.open}`,
					value: data.reports.open,
					href: href("/admin/reports"),
				},
				data.reports && {
					label: `${t.reports} · ${t.reviewing}`,
					value: data.reports.reviewing,
					href: href("/admin/reports"),
				},
				data.requests && {
					label: `${t.requests} · ${t.overdue}`,
					value: data.requests.overdue,
					href: href("/admin/requests"),
					danger: true,
				},
				data.sites && {
					label: `${t.sites} · ${t.suspended}`,
					value: data.sites.suspended,
					href: href("/admin/sites"),
				},
				data.auditAttention && {
					label: t.unresolved,
					value: data.auditAttention.unresolved,
					href: href("/admin/activity"),
					danger: true,
				},
				data.system && {
					label: t.expiredPendingUploads,
					value: data.system.expiredPendingUploads,
					href: href("/admin/system"),
				},
				data.system && {
					label: t.stuckDeletingUploads,
					value: data.system.stuckDeletingUploads,
					href: href("/admin/system"),
					danger: true,
				},
			].filter((item) => Boolean(item))
		: [];
	const items = attention as { label: string; value: number; href: string; danger?: boolean }[];
	const waiting = items.filter((item) => item.value > 0);
	return (
		<section className={ui.page}>
			<PageHeader title={t.overview} description={t.overviewIntro} />
			<RecordState state={state} locale={locale}>
				{data && (
					<>
						<div className={ui.stats}>
							{data.accounts && (
								<StatCard
									label={t.accounts}
									value={data.accounts.total}
									icon={UsersRound}
									href={href("/admin/accounts")}
									detail={`${data.accounts.banned} ${t.bannedShort}`}
								/>
							)}
							{data.sites && (
								<StatCard
									label={t.sites}
									value={data.sites.total}
									icon={Globe2}
									href={href("/admin/sites")}
									detail={`${data.sites.published} ${t.publishedShort} · ${data.sites.suspended} ${t.suspendedShort}`}
								/>
							)}
							{data.reports && (
								<StatCard
									label={`${t.reports} · ${t.open}`}
									value={data.reports.open}
									icon={Flag}
									tone={data.reports.open > 0 ? "warning" : undefined}
									href={href("/admin/reports")}
									detail={`${data.reports.reviewing} ${t.reviewingShort}`}
								/>
							)}
							{data.requests && (
								<StatCard
									label={t.requests}
									value={data.requests.open}
									icon={Inbox}
									tone={data.requests.overdue > 0 ? "danger" : undefined}
									href={href("/admin/requests")}
									detail={`${data.requests.overdue} ${t.overdueShort}`}
								/>
							)}
							{data.notices && (
								<StatCard
									label={t.current}
									value={data.notices.current}
									icon={Megaphone}
									href={href("/admin/notices")}
								/>
							)}
						</div>
						<div className={ui.grid2}>
							{data.recentEvents ? (
								<Panel
									title={t.recentActivity}
									padded={false}
									actions={
										<Link className={ui.buttonGhost} href={href("/admin/activity")}>
											{c.viewAll}
											<ChevronRight className={ui.mirror} size={15} aria-hidden="true" />
										</Link>
									}
								>
									<EventTable events={data.recentEvents} locale={locale} />
								</Panel>
							) : (
								<span />
							)}
							<Panel title={t.attention} padded={false}>
								{waiting.length === 0 && (
									<p className={ui.panelNote} role="status">
										{t.allClear}
									</p>
								)}
								<ul className={ui.list}>
									{items.map((item) => (
										<li key={item.label}>
											<Link className={ui.listRow} href={item.href}>
												<span>{item.label}</span>
												<span
													className={ui.count}
													data-tone={
														item.value > 0 ? (item.danger ? "danger" : "warning") : undefined
													}
												>
													{item.value}
												</span>
												<ChevronRight
													className={`${ui.muted} ${ui.mirror}`}
													size={16}
													aria-hidden="true"
												/>
											</Link>
										</li>
									))}
								</ul>
							</Panel>
						</div>
					</>
				)}
			</RecordState>
		</section>
	);
}
