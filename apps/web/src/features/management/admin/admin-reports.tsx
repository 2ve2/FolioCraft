"use client";
import { type ContentReport, reportCategories, reportStatuses } from "@ichnara/contracts";
import { Flag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "../../../lib/api";
import { localeHref } from "../../../lib/locale";
import { date, errorText } from "../shared";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { reportTone } from "./admin-directory";
import { useAdminData, useAdminList, useAdminRefresh } from "./admin-query";
import { SiteModerationDialog } from "./site-moderation-dialog";
import {
	type Column,
	DataTable,
	FilterSelect,
	KeyValues,
	PageHeader,
	Panel,
	RecordState,
	StatusBadge,
	Toolbar,
	ui,
} from "./ui/console";
import { useSiteModeration } from "./use-site-moderation";

/** Oldest-first report queue with server filters; rows open the report. */
export function AdminReports() {
	const { locale } = useAdminSession(),
		t = adminCopy[locale].report;
	const [status, setStatus] = useState("open"),
		[category, setCategory] = useState("");
	const query = new URLSearchParams({ limit: "20" });
	if (status) query.set("status", status);
	if (category) query.set("category", category);
	const list = useAdminList<ContentReport>(`/api/admin/reports?${query}`, "cursor", locale);
	const href = (row: ContentReport) => localeHref(locale, `/admin/reports/${row.id}`);
	const columns: Column<ContentReport>[] = [
		{
			key: "site",
			header: t.siteColumn,
			primary: true,
			cell: (row) => (
				<div className={ui.primaryText}>
					<Link className={ui.cellLink} href={href(row)} dir="ltr">
						{row.slug}
					</Link>
					<span className={ui.clip} dir="auto">
						{row.message}
					</span>
				</div>
			),
		},
		{ key: "category", header: t.category, cell: (row) => t[row.category] },
		{
			key: "status",
			header: t.status,
			cell: (row) => <StatusBadge tone={reportTone[row.status]}>{t[row.status]}</StatusBadge>,
		},
		{
			key: "created",
			header: t.created,
			cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
		},
	];
	return (
		<section className={ui.page}>
			<PageHeader title={t.title} description={t.description} />
			<Panel padded={false}>
				<Toolbar
					locale={locale}
					active={status !== "open" || Boolean(category)}
					onClear={() => {
						setStatus("open");
						setCategory("");
					}}
				>
					<FilterSelect
						label={t.status}
						value={status}
						onChange={setStatus}
						options={[
							{ value: "", label: t.all },
							...reportStatuses.map((value) => ({ value, label: t[value] })),
						]}
					/>
					<FilterSelect
						label={t.category}
						value={category}
						onChange={setCategory}
						options={[
							{ value: "", label: t.all },
							...reportCategories.map((value) => ({ value, label: t[value] })),
						]}
					/>
				</Toolbar>
				<DataTable
					label={t.title}
					columns={columns}
					rows={list.items}
					rowKey={(row) => row.id}
					rowHref={href}
					state={list}
					locale={locale}
					filtered={status !== "open" || Boolean(category)}
					empty={{ icon: Flag, title: t.empty }}
					loadingText={t.loading}
				/>
			</Panel>
		</section>
	);
}

/** Handles report state independently from the existing password-protected site moderation dialog. */
export function AdminReportDetail({ id }: { id: string }) {
	const { locale, permissions } = useAdminSession(),
		t = adminCopy[locale].report;
	const state = useAdminData<ContentReport>(`/api/admin/reports/${encodeURIComponent(id)}`, locale),
		report = state.data,
		refresh = useAdminRefresh();
	const [actionError, setActionError] = useState(""),
		[busy, setBusy] = useState(false),
		[note, setNote] = useState(""),
		[notice, setNotice] = useState("");
	const pending = useRef(false),
		epoch = useRef(0),
		noteFor = useRef<string | null>(null),
		controller = useSiteModeration(locale);
	// A different report invalidates pending transitions and clears this view's feedback.
	useEffect(() => {
		void id;
		epoch.current++;
		setBusy(false);
		setActionError("");
		setNotice("");
	}, [id]);
	// The note starts from the stored resolution once per report; background rereads keep typed text.
	useEffect(() => {
		if (!report || noteFor.current === report.id) return;
		noteFor.current = report.id;
		setNote(report.resolutionNote ?? "");
	}, [report]);
	/** Clears a failed transition and rereads the report, which may have changed meanwhile. */
	function retry() {
		setActionError("");
		state.reload();
	}
	/** Applies only a confirmed server transition and refuses stale completion work. */
	async function transition(status: "reviewing" | "dismissed" | "actioned") {
		if (pending.current || !report) return;
		pending.current = true;
		setBusy(true);
		setActionError("");
		setNotice("");
		const current = epoch.current;
		try {
			const value = await api<ContentReport>(`/api/admin/reports/${report.id}/status`, "POST", {
				status,
				...(note.trim() ? { resolutionNote: note.trim() } : {}),
			});
			if (current === epoch.current) {
				state.set(value);
				setNotice(t.saved);
			}
			refresh();
		} catch (e) {
			if (current === epoch.current)
				setActionError(
					e instanceof ApiError && e.code === "REPORT_STATUS_CONFLICT"
						? t.conflict
						: errorText(e, locale),
				);
		} finally {
			pending.current = false;
			if (current === epoch.current) setBusy(false);
		}
	}
	const canHandle = permissions.includes("report.handle"),
		closed = report?.status === "actioned" || report?.status === "dismissed",
		validNote = note.trim().length >= 10 && note.trim().length <= 500;
	const locked = busy || controller.busy;
	return (
		<section className={ui.page}>
			<PageHeader
				back={{ href: localeHref(locale, "/admin/reports"), label: t.title }}
				title={report ? <span dir="ltr">{report.slug}</span> : t.details}
				badges={
					report && (
						<>
							<StatusBadge tone={reportTone[report.status]}>{t[report.status]}</StatusBadge>
							<StatusBadge>{t[report.category]}</StatusBadge>
						</>
					)
				}
			/>
			{actionError && (
				<div className={ui.bannerRow} data-tone="danger" role="alert">
					<p>{actionError}</p>
					<button type="button" className={ui.button} disabled={busy} onClick={retry}>
						{t.retry}
					</button>
				</div>
			)}
			{notice && (
				<p className={ui.banner} role="status">
					{notice}
				</p>
			)}
			{controller.error && !controller.details && (
				<p className={ui.banner} data-tone="danger" role="alert">
					{controller.error}
				</p>
			)}
			{controller.notice && (
				<p className={ui.banner} role="status">
					{controller.notice}
				</p>
			)}
			<RecordState state={state} locale={locale}>
				{report && (
					<div className={ui.grid2}>
						<div className={ui.stack}>
							<Panel title={t.message}>
								<p className={ui.message} dir="auto">
									{report.message}
								</p>
							</Panel>
							{report.resolutionNote && (
								<Panel title={t.resolution}>
									<p className={ui.message} dir="auto">
										{report.resolutionNote}
									</p>
								</Panel>
							)}
							<Panel title={t.handling} description={closed ? t.closed : t.actionHelp}>
								{!closed && canHandle && (
									<div className={ui.form}>
										<label className={ui.field}>
											{t.note}
											<textarea
												className={ui.input}
												value={note}
												onChange={(e) => setNote(e.target.value)}
												minLength={10}
												maxLength={500}
												dir="auto"
												rows={4}
												disabled={locked}
											/>
										</label>
										<div className={ui.headerActions}>
											<button
												type="button"
												className={ui.button}
												disabled={
													locked ||
													report.status === "reviewing" ||
													Boolean(note.trim() && !validNote)
												}
												onClick={() => void transition("reviewing")}
											>
												{t.review}
											</button>
											<button
												type="button"
												className={ui.button}
												disabled={locked || !validNote}
												onClick={() => void transition("dismissed")}
											>
												{t.dismiss}
											</button>
											<button
												type="button"
												className={ui.buttonPrimary}
												disabled={locked || !validNote}
												onClick={() => void transition("actioned")}
											>
												{t.closeActioned}
											</button>
											{permissions.includes("site.suspend") && (
												<button
													type="button"
													className={ui.buttonDanger}
													disabled={locked}
													onClick={() =>
														controller.openSiteDetails(
															{ id: report.siteId },
															`${t.prefill} ${report.id}: ${t[report.category]}`,
														)
													}
												>
													{t.takeAction}
												</button>
											)}
										</div>
									</div>
								)}
							</Panel>
						</div>
						<Panel title={t.details}>
							<KeyValues
								items={[
									{
										label: t.reportedSite,
										value: (
											<Link
												className={ui.cellLink}
												href={localeHref(
													locale,
													`/admin/sites/${encodeURIComponent(report.siteId)}`,
												)}
												dir="ltr"
											>
												{report.slug}
											</Link>
										),
									},
									{
										label: t.site,
										value: (
											<a
												className={ui.cellLink}
												href={`/p/${encodeURIComponent(report.slug)}`}
												target="_blank"
												rel="noreferrer"
											>
												/p/<bdi>{report.slug}</bdi>
											</a>
										),
									},
									{ label: t.category, value: t[report.category] },
									{
										label: t.reporter,
										value: <span dir="ltr">{report.reporterEmail ?? "—"}</span>,
									},
									{ label: t.created, value: date(report.createdAt, locale) },
									{
										label: t.handledAt,
										value: report.handledAt ? date(report.handledAt, locale) : "—",
									},
									{ label: t.reportId, value: report.id, mono: true },
								]}
							/>
						</Panel>
					</div>
				)}
			</RecordState>
			<SiteModerationDialog controller={controller} locale={locale} />
		</section>
	);
}
