"use client";
import {
	type DataRequest,
	dataRequestStatuses,
	dataRequestTransitions,
	dataRequestTypes,
} from "@ichnara/contracts";
import { Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { ApiError, api, apiOrigin } from "../../../lib/api";
import { localeHref } from "../../../lib/locale";
import { date, errorText } from "../shared";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { useAdminData, useAdminList, useAdminRefresh } from "./admin-query";
import { requestsCopy } from "./requests-copy";
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

type RequestPage = { items: DataRequest[]; nextCursor: string | null; dueDays: number };
const statusTone = {
	received: "warning",
	in_progress: "info",
	completed: "success",
	rejected: "neutral",
} as const;
const isOverdue = (row: DataRequest) =>
	(row.status === "received" || row.status === "in_progress") &&
	new Date(row.dueAt).getTime() < Date.now();

/** Credentials are per action and cleared after every request and dialog dismissal. */
export function AdminRequests({ id }: { id?: string }) {
	const refresh = useAdminRefresh();
	const { locale, permissions } = useAdminSession(),
		t = requestsCopy[locale];
	const [status, setStatus] = useState(""),
		[type, setType] = useState(""),
		[overdue, setOverdue] = useState("");
	const [operation, setOperation] = useState<"create" | "status" | "subject" | "export" | null>(
			null,
		),
		[busy, setBusy] = useState(false),
		[failure, setFailure] = useState(""),
		[message, setMessage] = useState("");
	const [formType, setFormType] = useState("export"),
		[formStatus, setFormStatus] = useState("in_progress");
	const heading = useRef<HTMLHeadingElement>(null),
		pending = useRef(false);
	const q = new URLSearchParams({ limit: "20" });
	if (status) q.set("status", status);
	if (type) q.set("type", type);
	if (overdue) q.set("overdue", "true");
	const list = useAdminList<DataRequest, RequestPage>(
		id ? null : `/api/admin/requests?${q}`,
		"cursor",
		locale,
	);
	const state = useAdminData<DataRequest>(
		id ? `/api/admin/requests/${encodeURIComponent(id)}` : null,
		locale,
	);
	const detail = id ? state.data : null;
	function choose(value: NonNullable<typeof operation>) {
		setOperation(value);
		setFormType("export");
		setFormStatus(
			detail ? (dataRequestTransitions[detail.status][0] ?? "in_progress") : "in_progress",
		);
		setFailure("");
		setMessage("");
	}
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending.current || !operation) return;
		const form = event.currentTarget,
			data = new FormData(form),
			cred = { reason: String(data.get("reason")).trim(), password: String(data.get("password")) };
		const password = form.elements.namedItem("password");
		if (password instanceof HTMLInputElement) password.value = "";
		pending.current = true;
		setBusy(true);
		setFailure("");
		try {
			if (operation === "export") {
				const response = await fetch(`${apiOrigin}/api/admin/requests/${id}/export`, {
					method: "POST",
					credentials: "include",
					cache: "no-store",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(cred),
				});
				if (!response.ok) {
					const error = await response.json();
					throw new ApiError(error.code, "Export failed", response.status);
				}
				const url = URL.createObjectURL(await response.blob()),
					a = document.createElement("a");
				a.href = url;
				a.download = "subject-data.json";
				a.click();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
			} else {
				const body =
					operation === "create"
						? { request: { email: String(data.get("email")), type: String(data.get("type")) } }
						: operation === "subject"
							? {
									userId: String(data.get("userId")).trim(),
									confirmation: String(data.get("confirmation")).trim(),
									evidence: String(data.get("evidence")).trim(),
								}
							: {
									status: String(data.get("status")),
									...(String(data.get("notes") ?? "").trim()
										? { notes: String(data.get("notes")).trim() }
										: {}),
								};
				await api(
					operation === "create" ? "/api/admin/requests" : `/api/admin/requests/${id}/${operation}`,
					operation === "status" ? "PATCH" : "POST",
					{ ...cred, ...body },
				);
			}
			setOperation(null);
			setMessage(t.saved);
			refresh();
		} catch (e) {
			setFailure(
				e instanceof ApiError && e.code in t ? t[e.code as keyof typeof t] : errorText(e, locale),
			);
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}
	const filtered = Boolean(status || type || overdue);
	const href = (row: DataRequest) => localeHref(locale, `/admin/requests/${row.id}`);
	const columns: Column<DataRequest>[] = [
		{
			key: "request",
			header: t.request,
			primary: true,
			cell: (row) => (
				<div className={ui.primaryText}>
					<Link className={ui.cellLink} href={href(row)}>
						{t[row.type]}
					</Link>
					<span dir="ltr">{row.email}</span>
				</div>
			),
		},
		{
			key: "status",
			header: t.status,
			cell: (row) => (
				<span className={ui.titleRow}>
					<StatusBadge tone={statusTone[row.status]}>{t[row.status]}</StatusBadge>
					{isOverdue(row) && <StatusBadge tone="danger">{t.overdueBadge}</StatusBadge>}
				</span>
			),
		},
		{
			key: "due",
			header: t.due,
			cell: (row) => <span className={ui.muted}>{date(row.dueAt, locale)}</span>,
		},
		{
			key: "received",
			header: t.receivedAt,
			cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
		},
	];
	const canHandle = permissions.includes("request.handle");
	return (
		<section className={ui.page}>
			<PageHeader
				back={id ? { href: localeHref(locale, "/admin/requests"), label: t.title } : undefined}
				title={id ? (detail ? t[detail.type] : t.details) : t.title}
				description={id ? undefined : t.intro}
				badges={
					detail && (
						<>
							<StatusBadge tone={statusTone[detail.status]}>{t[detail.status]}</StatusBadge>
							{isOverdue(detail) && <StatusBadge tone="danger">{t.overdueBadge}</StatusBadge>}
						</>
					)
				}
				actions={
					id
						? detail && (
								<>
									{canHandle && dataRequestTransitions[detail.status].length > 0 && (
										<button
											type="button"
											className={ui.buttonPrimary}
											onClick={() => choose("status")}
										>
											{t.save}
										</button>
									)}
									{canHandle && detail.status === "in_progress" && !detail.subjectVerifiedAt && (
										<button type="button" className={ui.button} onClick={() => choose("subject")}>
											{t.verify}
										</button>
									)}
									{permissions.includes("request.export") &&
										detail.type === "export" &&
										detail.status === "in_progress" &&
										detail.userId && (
											<button type="button" className={ui.button} onClick={() => choose("export")}>
												{t.download}
											</button>
										)}
								</>
							)
						: canHandle && (
								<button type="button" className={ui.buttonPrimary} onClick={() => choose("create")}>
									<Plus size={16} aria-hidden="true" />
									{t.create}
								</button>
							)
				}
			/>
			{message && (
				<p className={ui.banner} role="status">
					{message}
				</p>
			)}
			{!id && list.first && (
				<p className={ui.banner} data-tone="info">
					{t.dueIn.replace("{days}", String(list.first.dueDays))} {t.duePolicy}
				</p>
			)}
			{id ? (
				<RecordState state={state} locale={locale}>
					{detail && (
						<div className={ui.grid2}>
							<div className={ui.stack}>
								<Panel title={t.handling}>
									{detail.notes ? (
										<p className={ui.message} dir="auto">
											{detail.notes}
										</p>
									) : (
										<p className={ui.muted}>—</p>
									)}
								</Panel>
								<p className={ui.banner} data-tone="info">
									{t.closureWarning}
								</p>
								{detail.type === "export" && (
									<p className={ui.banner} data-tone="info">
										{t.exportWarning}
									</p>
								)}
							</div>
							<Panel title={t.details}>
								<KeyValues
									items={[
										{ label: t.email, value: <span dir="ltr">{detail.email}</span> },
										{ label: t.type, value: t[detail.type] },
										{ label: t.receivedAt, value: date(detail.createdAt, locale) },
										{ label: t.due, value: date(detail.dueAt, locale) },
										{
											label: t.subject,
											value: detail.userId ?? t.unverified,
											mono: Boolean(detail.userId),
										},
										{
											label: t.verifiedAt,
											value: detail.subjectVerifiedAt
												? date(detail.subjectVerifiedAt, locale)
												: t.none,
										},
										{ label: t.id, value: detail.id, mono: true },
									]}
								/>
							</Panel>
						</div>
					)}
				</RecordState>
			) : (
				<Panel padded={false}>
					<Toolbar
						locale={locale}
						active={filtered}
						onClear={() => {
							setStatus("");
							setType("");
							setOverdue("");
						}}
					>
						<FilterSelect
							label={t.status}
							value={status}
							onChange={setStatus}
							options={[
								{ value: "", label: t.all },
								...dataRequestStatuses.map((v) => ({ value: v, label: t[v] })),
							]}
						/>
						<FilterSelect
							label={t.type}
							value={type}
							onChange={setType}
							options={[
								{ value: "", label: t.all },
								...dataRequestTypes.map((v) => ({ value: v, label: t[v] })),
							]}
						/>
						<FilterSelect
							label={t.overdueBadge}
							value={overdue}
							onChange={setOverdue}
							options={[
								{ value: "", label: t.all },
								{ value: "true", label: t.overdue },
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
						filtered={filtered}
						empty={{ icon: Inbox, title: t.noRequests }}
					/>
				</Panel>
			)}
			{operation && (
				<AdminDialog
					title={
						operation === "create"
							? t.create
							: operation === "subject"
								? t.verify
								: operation === "export"
									? t.download
									: t.save
					}
					locale={locale}
					busy={busy}
					headingRef={heading}
					onClose={() => setOperation(null)}
				>
					<form onSubmit={submit} className={ui.form}>
						{operation === "create" && (
							<>
								<label className={ui.field}>
									{t.email}
									<input
										className={ui.input}
										name="email"
										type="email"
										required
										maxLength={254}
										dir="ltr"
									/>
								</label>
								<input type="hidden" name="type" value={formType} />
								<FilterSelect
									label={t.type}
									value={formType}
									onChange={setFormType}
									options={dataRequestTypes.map((v) => ({ value: v, label: t[v] }))}
								/>
							</>
						)}
						{operation === "subject" && (
							<>
								<p className={ui.description}>{t.verifyWarning}</p>
								<label className={ui.field}>
									{t.subject}
									<input className={ui.input} name="userId" required maxLength={128} dir="ltr" />
								</label>
								<label className={ui.field}>
									{t.confirm}
									<input
										className={ui.input}
										name="confirmation"
										required
										maxLength={128}
										dir="ltr"
									/>
								</label>
								<label className={ui.field}>
									{t.evidence}
									<textarea
										className={ui.input}
										name="evidence"
										required
										minLength={10}
										maxLength={500}
										dir="auto"
									/>
								</label>
							</>
						)}
						{operation === "status" && detail && (
							<>
								<p className={ui.description}>{t.closureWarning}</p>
								<input type="hidden" name="status" value={formStatus} />
								<FilterSelect
									label={t.status}
									value={formStatus}
									onChange={setFormStatus}
									options={dataRequestTransitions[detail.status].map((v) => ({
										value: v,
										label: t[v],
									}))}
								/>
								<label className={ui.field}>
									{t.notes}
									<textarea
										className={ui.input}
										name="notes"
										required
										minLength={10}
										maxLength={500}
										dir="auto"
									/>
								</label>
							</>
						)}
						{operation === "export" && <p className={ui.description}>{t.exportWarning}</p>}
						<label className={ui.field}>
							{t.reason}
							<textarea
								className={ui.input}
								name="reason"
								required
								minLength={10}
								maxLength={500}
								dir="auto"
							/>
						</label>
						<label className={ui.field}>
							{t.password}
							<input
								className={ui.input}
								name="password"
								type="password"
								required
								autoComplete="current-password"
								maxLength={1024}
							/>
						</label>
						{failure && (
							<p className={ui.banner} data-tone="danger" role="alert">
								{failure}
							</p>
						)}
						<button className={ui.buttonPrimary} type="submit" disabled={busy}>
							<ButtonContent loading={busy}>
								{operation === "export" ? t.download : t.save}
							</ButtonContent>
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
