"use client";
import type { Locale } from "@ichnara/contracts";
import { Download, History, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { ApiError, apiOrigin } from "../../../lib/api";
import { date, errorText } from "../shared";
import type { Audit, Page } from "../shared/types";
import { useAdminSession } from "./admin-context";
import { actionLabel, recordedActions, targetLabel } from "./admin-copy";
import { AdminDialog } from "./admin-dialog";
import { useAdminData, useAdminList, useAdminRefresh } from "./admin-query";
import { directoryCopy } from "./directory-copy";
import { operationsCopy } from "./operations-copy";
import {
	type Column,
	DataTable,
	FilterSelect,
	KeyValues,
	PageHeader,
	Panel,
	StatusBadge,
	Toolbar,
	ui,
	useDebouncedValue,
} from "./ui/console";

export type AuditEvent = Audit & {
	requestId: string;
	metadata: Record<string, string | number | boolean | null>;
};

const statusTone = { attempted: "neutral", succeeded: "success", failed: "danger" } as const;

/**
 * One row per request: an attempt and its outcome share a request ID, so the row shows the action
 * once with the outcome when recorded (otherwise the attempt). `open` shows the whole group.
 */
export function EventTable({
	events,
	locale,
	open,
	state,
	filtered,
}: {
	events: AuditEvent[];
	locale: Locale;
	open?: (requestId: string) => void;
	state?: Parameters<typeof DataTable<AuditEvent>>[0]["state"];
	filtered?: boolean;
}) {
	const t = operationsCopy[locale],
		d = directoryCopy[locale];
	const rows = [...Map.groupBy(events, (row) => row.requestId).values()].map(
		(group) => group.find((row) => row.status !== "attempted") ?? group[0],
	);
	const columns: Column<AuditEvent>[] = [
		{
			key: "action",
			header: t.action,
			primary: true,
			cell: (row) => (
				<div className={ui.primaryText}>
					<strong title={row.action}>{actionLabel(row.action, locale)}</strong>
					<span>
						{targetLabel(row.targetType, locale)}
						{row.targetId && (
							<>
								{" · "}
								<span className={ui.mono} dir="ltr">
									{row.targetId}
								</span>
							</>
						)}
					</span>
				</div>
			),
		},
		{
			key: "status",
			header: t.status,
			cell: (row) => <StatusBadge tone={statusTone[row.status]}>{t[row.status]}</StatusBadge>,
		},
		{
			key: "time",
			header: t.time,
			cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
		},
		...(open
			? [
					{
						key: "details",
						header: d.actions,
						align: "end" as const,
						cell: (row: AuditEvent) => (
							<button type="button" className={ui.buttonGhost} onClick={() => open(row.requestId)}>
								{t.details}
							</button>
						),
					},
				]
			: []),
	];
	return (
		<DataTable
			label={t.activity}
			columns={columns}
			rows={rows}
			rowKey={(row) => row.requestId}
			state={state ?? { loaded: true, error: "", reload: () => {} }}
			locale={locale}
			filtered={filtered}
			empty={{ icon: History, title: t.noEvents }}
		/>
	);
}

/** Filterable audit log; a request's attempt and outcome open together in a side drawer. */
export function AdminActivityPage() {
	const refresh = useAdminRefresh();
	const { locale, permissions } = useAdminSession(),
		t = operationsCopy[locale],
		d = directoryCopy[locale];
	const [filters, setFilters] = useState<Record<string, string>>({}),
		[selected, setSelected] = useState<string | null>(null),
		[exporting, setExporting] = useState(false),
		[reason, setReason] = useState(""),
		[password, setPassword] = useState(""),
		[maxRows, setMaxRows] = useState(100),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(""),
		[advanced, setAdvanced] = useState(false);
	const heading = useRef<HTMLHeadingElement>(null),
		drawer = useRef<HTMLHeadingElement>(null);
	const settled = useDebouncedValue(filters, 400);
	// Date bounds are sent as ISO instants; an incomplete date is ignored rather than sent.
	const applied = Object.fromEntries(
		Object.entries(settled)
			.map(([key, value]) => {
				const trimmed = value.trim();
				if (!trimmed || (key !== "from" && key !== "to")) return [key, trimmed];
				const time = new Date(trimmed);
				return [key, Number.isNaN(time.getTime()) ? "" : time.toISOString()];
			})
			.filter(([, value]) => value),
	);
	const list = useAdminList<AuditEvent>(
		`/api/admin/audit?${new URLSearchParams({ ...applied, limit: "20" })}`,
		"offset",
		locale,
	);
	const details = useAdminData<Page<AuditEvent>>(
			selected ? `/api/admin/audit?requestId=${encodeURIComponent(selected)}&limit=100` : null,
			locale,
		),
		system = useAdminData<{ auditExportMaxRows: number }>(
			permissions.includes("audit.export") ? "/api/admin/system" : null,
			locale,
		);
	const change = (key: string) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));
	// Identifier and date filters stay open while any of them is set.
	const showAdvanced =
		advanced || ["actorId", "targetId", "from", "to"].some((key) => filters[key]?.trim());

	/** Downloads the identifier-only CSV after the server re-checks the reason and password. */
	async function download() {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			const response = await fetch(`${apiOrigin}/api/admin/audit/export`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filters: applied, maxRows, reason: reason.trim(), password }),
				cache: "no-store",
			});
			if (!response.ok) {
				const body = await response.json().catch(() => null);
				throw new ApiError(body?.code ?? "REQUEST_FAILED", "", response.status);
			}
			const url = URL.createObjectURL(await response.blob());
			const a = document.createElement("a");
			a.href = url;
			a.download = "admin-activity.csv";
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			setExporting(false);
			refresh();
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setPassword("");
			setBusy(false);
		}
	}
	const textFilter = (key: "actorId" | "targetId") => (
		<label className={ui.filter} key={key}>
			{t[key]}
			<input
				className={ui.input}
				dir="ltr"
				maxLength={128}
				value={filters[key] ?? ""}
				onChange={(e) => change(key)(e.target.value)}
			/>
		</label>
	);
	return (
		<section className={ui.page}>
			<PageHeader
				title={t.activity}
				description={t.activityIntro}
				actions={
					permissions.includes("audit.export") && (
						<button
							type="button"
							className={ui.button}
							disabled={!system.data}
							onClick={() => {
								setExporting(true);
								setReason("");
								setPassword("");
								setError("");
							}}
						>
							<Download size={16} aria-hidden="true" />
							{t.export}
						</button>
					)
				}
			/>
			<Panel padded={false}>
				<Toolbar
					locale={locale}
					active={Object.values(filters).some((value) => value.trim())}
					onClear={() => setFilters({})}
				>
					<FilterSelect
						label={t.action}
						value={filters.action ?? ""}
						onChange={change("action")}
						options={[
							{ value: "", label: d.all },
							...recordedActions.map((value) => ({ value, label: actionLabel(value, locale) })),
						]}
					/>
					<FilterSelect
						label={t.status}
						value={filters.status ?? ""}
						onChange={change("status")}
						options={[
							{ value: "", label: d.all },
							...(["attempted", "succeeded", "failed"] as const).map((value) => ({
								value,
								label: t[value],
							})),
						]}
					/>
					<FilterSelect
						label={t.targetType}
						value={filters.targetType ?? ""}
						onChange={change("targetType")}
						options={[
							{ value: "", label: d.all },
							...["user", "site", "session", "report", "notice", "audit", "request"].map(
								(value) => ({ value, label: targetLabel(value, locale) }),
							),
						]}
					/>
					<button
						type="button"
						className={ui.buttonGhost}
						aria-expanded={showAdvanced}
						onClick={() => setAdvanced(!showAdvanced)}
					>
						<SlidersHorizontal size={16} aria-hidden="true" />
						{t.moreFilters}
					</button>
					{showAdvanced && (
						<div className={ui.toolbarRow}>
							{textFilter("actorId")}
							{textFilter("targetId")}
							{(["from", "to"] as const).map((key) => (
								<label className={ui.filter} key={key}>
									{t[key]}
									<input
										className={ui.input}
										type="datetime-local"
										value={filters[key] ?? ""}
										onChange={(e) => change(key)(e.target.value)}
									/>
								</label>
							))}
						</div>
					)}
				</Toolbar>
				<EventTable
					events={list.items}
					locale={locale}
					open={setSelected}
					state={list}
					filtered={Object.keys(applied).length > 0}
				/>
			</Panel>
			{selected && (
				<AdminDialog
					drawer
					headingRef={drawer}
					title={t.details}
					locale={locale}
					busy={false}
					onClose={() => setSelected(null)}
				>
					<div className={ui.stack}>
						<KeyValues items={[{ label: t.requestId, value: selected, mono: true }]} />
						{details.error && (
							<p className={ui.banner} data-tone="danger" role="alert">
								{details.error}
							</p>
						)}
						{details.data?.items.map((e) => (
							<Panel
								key={e.id}
								title={
									<span className={ui.titleRow}>
										<span title={e.action}>{actionLabel(e.action, locale)}</span>
										<StatusBadge tone={statusTone[e.status]}>{t[e.status]}</StatusBadge>
									</span>
								}
							>
								<KeyValues
									items={[
										{ label: t.time, value: date(e.createdAt, locale) },
										{ label: t.actorId, value: e.actorId ?? "—", mono: true },
										{ label: t.target, value: targetLabel(e.targetType, locale) },
										{ label: t.targetId, value: e.targetId, mono: true },
										{ label: t.action, value: e.action, mono: true },
										{ label: t.reason, value: e.reason, hidden: !e.reason },
									]}
								/>
								{Object.keys(e.metadata ?? {}).length > 0 && (
									<>
										<h3 className={ui.panelTitle}>{t.metadata}</h3>
										<pre className={ui.code}>{JSON.stringify(e.metadata, null, 2)}</pre>
									</>
								)}
							</Panel>
						))}
					</div>
				</AdminDialog>
			)}
			{exporting && (
				<AdminDialog
					headingRef={heading}
					title={t.export}
					locale={locale}
					busy={busy}
					onClose={() => {
						setExporting(false);
						setPassword("");
					}}
				>
					<form
						className={ui.form}
						onSubmit={(e) => {
							e.preventDefault();
							void download();
						}}
					>
						<p className={ui.description}>{t.csvHelp}</p>
						{error && (
							<p className={ui.banner} data-tone="danger" role="alert">
								{error}
							</p>
						)}
						<label className={ui.field}>
							{t.maxRows}
							<input
								className={ui.input}
								required
								type="number"
								min={1}
								max={system.data?.auditExportMaxRows ?? 1000}
								value={maxRows}
								onChange={(e) => setMaxRows(Number(e.target.value))}
							/>
						</label>
						<label className={ui.field}>
							{d.reason}
							<textarea
								className={ui.input}
								required
								minLength={10}
								maxLength={500}
								dir="auto"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							/>
						</label>
						<label className={ui.field}>
							{d.password}
							<input
								className={ui.input}
								required
								type="password"
								autoComplete="current-password"
								maxLength={1024}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</label>
						<button
							className={ui.buttonPrimary}
							type="submit"
							disabled={busy || reason.trim().length < 10 || !password}
						>
							<ButtonContent loading={busy}>{t.export}</ButtonContent>
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
