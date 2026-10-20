"use client";
import {
	type DataRequest,
	dataRequestStatuses,
	dataRequestTransitions,
	dataRequestTypes,
} from "@ichnara/contracts";
import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { SelectControl } from "../../../components/ui/select-control";
import { ApiError, api, apiOrigin } from "../../../lib/api";
import { date, errorText } from "../shared";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { ReadState, useAdminData } from "./admin-directory";
import fields from "./operations.module.css";
import layout from "./reports.module.css";
import { requestsCopy } from "./requests-copy";

/** Credentials are per action and cleared after every request and dialog dismissal. */
export function AdminRequests({ id }: { id?: string }) {
	const { locale, permissions } = useAdminSession(),
		t = requestsCopy[locale];
	const [status, setStatus] = useState(""),
		[type, setType] = useState(""),
		[overdue, setOverdue] = useState(false),
		[cursor, setCursor] = useState<string | null>(null);
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
	if (cursor) q.set("cursor", cursor);
	const state = useAdminData<
		DataRequest | { items: DataRequest[]; nextCursor: string | null; dueDays: number }
	>(id ? `/api/admin/requests/${id}` : `/api/admin/requests?${q}`, locale);
	const detail = state.data && "id" in state.data ? state.data : null,
		page = state.data && "items" in state.data ? state.data : null;
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
			state.reload();
		} catch (e) {
			setFailure(
				e instanceof ApiError && e.code in t ? t[e.code as keyof typeof t] : errorText(e, locale),
			);
		} finally {
			pending.current = false;
			setBusy(false);
		}
	}
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{id ? t.details : t.title}</h1>
			<p>{t.intro}</p>
			<p>{t.duePolicy}</p>
			{message && <p role="status">{message}</p>}
			{id ? (
				<Link href={`/admin/requests?lang=${locale}`}>{t.back}</Link>
			) : (
				<>
					<div className={layout.filters}>
						<div>
							<span>{t.status}</span>
							<SelectControl
								label={t.status}
								value={status}
								onChange={(v) => {
									setStatus(v);
									setCursor(null);
								}}
								options={[
									{ value: "", label: t.all },
									...dataRequestStatuses.map((v) => ({ value: v, label: t[v] })),
								]}
							/>
						</div>
						<div>
							<span>{t.type}</span>
							<SelectControl
								label={t.type}
								value={type}
								onChange={(v) => {
									setType(v);
									setCursor(null);
								}}
								options={[
									{ value: "", label: t.all },
									...dataRequestTypes.map((v) => ({ value: v, label: t[v] })),
								]}
							/>
						</div>
						<label>
							<input
								type="checkbox"
								checked={overdue}
								onChange={(e) => {
									setOverdue(e.target.checked);
									setCursor(null);
								}}
							/>
							{t.overdue}
						</label>
					</div>
					{permissions.includes("request.handle") && (
						<button type="button" className="primary" onClick={() => choose("create")}>
							{t.create}
						</button>
					)}
				</>
			)}
			<ReadState state={state}>{null}</ReadState>
			{page && (
				<>
					<p>
						{page.dueDays} — {t.duePolicy}
					</p>
					{!page.items.length && <p>{t.empty}</p>}
					{page.items.map((row) => (
						<article className={styles.card} key={row.id}>
							<Link href={`/admin/requests/${row.id}?lang=${locale}`}>
								<bdi>{row.id}</bdi>
							</Link>
							<p>
								{t[row.type]} · {t[row.status]}
							</p>
							<p>
								{t.due}: {date(row.dueAt, locale)}
							</p>
							<bdi>{row.email}</bdi>
						</article>
					))}
					<div className={styles.actions}>
						<button type="button" disabled={!cursor} onClick={() => setCursor(null)}>
							{t.first}
						</button>
						<button
							type="button"
							disabled={!page.nextCursor}
							onClick={() => setCursor(page.nextCursor)}
						>
							{t.next}
						</button>
					</div>
				</>
			)}
			{detail && (
				<>
					<article className={styles.card}>
						<p>
							<bdi>{detail.id}</bdi>
						</p>
						<p>
							{t[detail.type]} · {t[detail.status]}
						</p>
						<p>
							{t.email}: <bdi>{detail.email}</bdi>
						</p>
						<p>
							{t.due}: {date(detail.dueAt, locale)}
						</p>
						<p>
							{t.subject}: <bdi>{detail.userId ?? t.unverified}</bdi>
						</p>
						<p>
							{t.verifiedAt}:{" "}
							{detail.subjectVerifiedAt ? date(detail.subjectVerifiedAt, locale) : t.none}
						</p>
						<p dir="auto">{detail.notes}</p>
					</article>
					<p>{t.closureWarning}</p>
					<p>{t.exportWarning}</p>
					<div className={styles.actions}>
						{permissions.includes("request.handle") &&
							dataRequestTransitions[detail.status].length > 0 && (
								<button type="button" onClick={() => choose("status")}>
									{t.save}
								</button>
							)}
						{permissions.includes("request.handle") &&
							detail.status === "in_progress" &&
							!detail.subjectVerifiedAt && (
								<button type="button" onClick={() => choose("subject")}>
									{t.verify}
								</button>
							)}
						{permissions.includes("request.export") &&
							detail.type === "export" &&
							detail.status === "in_progress" &&
							detail.userId && (
								<button type="button" onClick={() => choose("export")}>
									{t.download}
								</button>
							)}
					</div>
				</>
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
					<form onSubmit={submit} className={fields.form}>
						{operation === "create" && (
							<>
								<label className="field">
									{t.email}
									<input name="email" type="email" required maxLength={254} dir="ltr" />
								</label>
								<input type="hidden" name="type" value={formType} />
								<div>
									<span>{t.type}</span>
									<SelectControl
										label={t.type}
										value={formType}
										onChange={setFormType}
										options={dataRequestTypes.map((v) => ({ value: v, label: t[v] }))}
									/>
								</div>
							</>
						)}
						{operation === "subject" && (
							<>
								<p>{t.verifyWarning}</p>
								<label className="field">
									{t.subject}
									<input name="userId" required maxLength={128} dir="ltr" />
								</label>
								<label className="field">
									{t.confirm}
									<input name="confirmation" required maxLength={128} dir="ltr" />
								</label>
								<label className="field">
									{t.evidence}
									<textarea name="evidence" required minLength={10} maxLength={500} dir="auto" />
								</label>
							</>
						)}
						{operation === "status" && detail && (
							<>
								<p>{t.closureWarning}</p>
								<input type="hidden" name="status" value={formStatus} />
								<div>
									<span>{t.status}</span>
									<SelectControl
										label={t.status}
										value={formStatus}
										onChange={setFormStatus}
										options={dataRequestTransitions[detail.status].map((v) => ({
											value: v,
											label: t[v],
										}))}
									/>
								</div>
								<label className="field">
									{t.notes}
									<textarea name="notes" required minLength={10} maxLength={500} dir="auto" />
								</label>
							</>
						)}
						{operation === "export" && <p>{t.exportWarning}</p>}
						<label className="field">
							{t.reason}
							<textarea name="reason" required minLength={10} maxLength={500} dir="auto" />
						</label>
						<label className="field">
							{t.password}
							<input
								name="password"
								type="password"
								required
								autoComplete="current-password"
								maxLength={1024}
							/>
						</label>
						{failure && <p role="alert">{failure}</p>}
						<button className="primary" type="submit" disabled={busy}>
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
