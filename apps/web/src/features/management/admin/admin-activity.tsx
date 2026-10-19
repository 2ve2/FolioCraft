"use client";
import { useRef, useState } from "react";
import { ApiError, apiOrigin } from "../../../lib/api";
import { date, errorText } from "../shared";
import type { Audit, Page } from "../shared/types";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { DirectoryFilter, ReadState, useAdminData } from "./admin-directory";
import { AdminPagination } from "./admin-lists";
import { directoryCopy } from "./directory-copy";
import fields from "./operations.module.css";
import { operationsCopy } from "./operations-copy";
import layout from "./reports.module.css";
export type AuditEvent = Audit & {
	requestId: string;
	metadata: Record<string, string | number | boolean | null>;
};
export function AuditEvents({ items, open }: { items: AuditEvent[]; open?: (id: string) => void }) {
	const { locale } = useAdminSession(),
		t = operationsCopy[locale];
	const groups = Map.groupBy(items, (row) => row.requestId);
	return (
		<ul className={layout.queue}>
			{[...groups].map(([id, events]) => (
				<li key={id}>
					<p>
						<bdi>{id}</bdi>
					</p>
					{events.map((e) => (
						<p key={e.id}>
							<bdi>{e.action}</bdi> · {t[e.status]} · {date(e.createdAt, locale)}
						</p>
					))}
					{open && (
						<button type="button" className={styles.rowAction} onClick={() => open(id)}>
							{t.details}
						</button>
					)}
				</li>
			))}
		</ul>
	);
}
/** Correlates attempt/outcome rows by request ID and fetches the complete bounded group in a drawer. */
export function AdminActivityPage() {
	const { locale, permissions } = useAdminSession(),
		t = operationsCopy[locale],
		d = directoryCopy[locale];
	const [filters, setFilters] = useState<Record<string, string>>({}),
		[applied, setApplied] = useState<Record<string, string>>({}),
		[offset, setOffset] = useState(0),
		[selected, setSelected] = useState<string | null>(null),
		[exporting, setExporting] = useState(false),
		[reason, setReason] = useState(""),
		[password, setPassword] = useState(""),
		[maxRows, setMaxRows] = useState(100),
		[busy, setBusy] = useState(false),
		[error, setError] = useState("");
	const heading = useRef<HTMLHeadingElement>(null),
		drawer = useRef<HTMLHeadingElement>(null);
	const query = new URLSearchParams({ ...applied, limit: "20", offset: String(offset) }),
		state = useAdminData<Page<AuditEvent>>(`/api/admin/audit?${query}`, locale),
		details = useAdminData<Page<AuditEvent>>(
			selected ? `/api/admin/audit?requestId=${encodeURIComponent(selected)}&limit=100` : null,
			locale,
		),
		system = useAdminData<{ auditExportMaxRows: number }>(
			permissions.includes("audit.export") ? "/api/admin/system" : null,
			locale,
		);
	function change(key: string, value: string) {
		setFilters((f) => ({ ...f, [key]: value }));
	}
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
			state.reload();
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setPassword("");
			setBusy(false);
		}
	}
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t.activity}</h1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
					for (const key of ["from", "to"]) if (q[key]) q[key] = new Date(q[key]).toISOString();
					setApplied(q);
					setOffset(0);
				}}
			>
				<div className={layout.filters}>
					{(["actorId", "action", "targetId"] as const).map((key) => (
						<label key={key}>
							{t[key]}
							<input
								dir="ltr"
								maxLength={key === "action" ? 100 : 128}
								value={filters[key] ?? ""}
								onChange={(e) => change(key, e.target.value)}
							/>
						</label>
					))}
					<DirectoryFilter
						label={t.targetType}
						value={filters.targetType ?? ""}
						change={(v) => change("targetType", v)}
						choices={["user", "site", "session", "report", "notice", "audit", "request"].map(
							(value) => ({
								value,
								label: value,
							}),
						)}
					/>
					<DirectoryFilter
						label={t.status}
						value={filters.status ?? ""}
						change={(v) => change("status", v)}
						choices={(["attempted", "succeeded", "failed"] as const).map((value) => ({
							value,
							label: t[value],
						}))}
					/>
					{(["from", "to"] as const).map((key) => (
						<label key={key}>
							{t[key]}
							<input
								type="datetime-local"
								value={filters[key] ?? ""}
								onChange={(e) => change(key, e.target.value)}
							/>
						</label>
					))}
				</div>
				<button className={styles.primary} type="submit">
					{t.apply}
				</button>
			</form>
			{permissions.includes("audit.export") && (
				<button
					type="button"
					className={styles.secondary}
					disabled={!system.data}
					onClick={() => {
						setExporting(true);
						setReason("");
						setPassword("");
						setError("");
					}}
				>
					{t.export}
				</button>
			)}
			<ReadState state={state}>
				{state.data?.items.length === 0 ? (
					<p>{d.empty}</p>
				) : (
					<AuditEvents items={state.data?.items ?? []} open={setSelected} />
				)}
				<AdminPagination
					locale={locale}
					count={state.data?.items.length ?? 0}
					offset={offset}
					more={state.data?.hasMore ?? false}
					disabled={!state.data}
					change={setOffset}
				/>
			</ReadState>
			{selected && (
				<AdminDialog
					drawer
					headingRef={drawer}
					title={t.details}
					locale={locale}
					busy={false}
					onClose={() => setSelected(null)}
				>
					<ReadState state={details}>
						<AuditEvents items={details.data?.items ?? []} />
						{details.data?.items.map((e) => (
							<section key={e.id}>
								<h3>
									<bdi>{e.id}</bdi>
								</h3>
								<p>
									{t.actorId}: <bdi>{e.actorId ?? "—"}</bdi>
								</p>
								<p>
									{t.targetId}:{" "}
									<bdi>
										{e.targetType} · {e.targetId}
									</bdi>
								</p>
								{e.reason && (
									<p dir="auto">
										{t.reason}: {e.reason}
									</p>
								)}
								<h4>{t.metadata}</h4>
								<pre>{JSON.stringify(e.metadata, null, 2)}</pre>
							</section>
						))}
					</ReadState>
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
						onSubmit={(e) => {
							e.preventDefault();
							void download();
						}}
					>
						<p>{t.csvHelp}</p>
						{error && <p role="alert">{error}</p>}
						<label>
							{t.maxRows}
							<input
								required
								type="number"
								min={1}
								max={system.data?.auditExportMaxRows ?? 1000}
								value={maxRows}
								onChange={(e) => setMaxRows(Number(e.target.value))}
							/>
						</label>
						<label>
							{d.reason}
							<textarea
								required
								minLength={10}
								maxLength={500}
								dir="auto"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							/>
						</label>
						<label>
							{d.password}
							<input
								required
								type="password"
								autoComplete="current-password"
								maxLength={1024}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</label>
						<button
							className={styles.primary}
							type="submit"
							disabled={busy || reason.trim().length < 10 || !password}
						>
							{t.export}
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
