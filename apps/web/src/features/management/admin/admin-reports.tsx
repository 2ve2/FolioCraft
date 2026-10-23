"use client";
import {
	type ContentReport,
	type ReportPage,
	reportCategories,
	reportStatuses,
} from "@ichnara/contracts";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SelectControl } from "../../../components/ui/select-control";
import { ApiError, api } from "../../../lib/api";
import { localeHref } from "../../../lib/locale";
import { errorText } from "../shared";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import reportStyles from "./reports.module.css";
import { SiteModerationDialog } from "./site-moderation-dialog";
import { useSiteModeration } from "./use-site-moderation";

/** Renders a stable oldest-first queue with cursor navigation and independent server filters. */
export function AdminReports() {
	const { locale } = useAdminSession(),
		t = adminCopy[locale].report;
	const [status, setStatus] = useState("open"),
		[category, setCategory] = useState(""),
		[cursor, setCursor] = useState<string | null>(null),
		[page, setPage] = useState<ReportPage | null>(null),
		[error, setError] = useState(""),
		[version, setVersion] = useState(0);
	useEffect(() => {
		let current = true;
		setPage(null);
		setError("");
		const query = new URLSearchParams({ limit: "20" });
		if (status) query.set("status", status);
		if (category) query.set("category", category);
		if (cursor) query.set("cursor", cursor);
		void version;
		api<ReportPage>(`/api/admin/reports?${query}`)
			.then((value) => {
				if (current) setPage(value);
			})
			.catch((e) => {
				if (current) setError(errorText(e, locale));
			});
		return () => {
			current = false;
		};
	}, [locale, status, category, cursor, version]);
	return (
		<section className={reportStyles.page}>
			<header>
				<h1>{t.title}</h1>
				<p>{t.description}</p>
			</header>
			<div className={reportStyles.filters}>
				<div>
					<span>{t.status}</span>
					<SelectControl
						label={t.status}
						value={status}
						onChange={(value) => {
							setStatus(value);
							setCursor(null);
						}}
						options={[
							{ value: "", label: t.all },
							...reportStatuses.map((value) => ({ value, label: t[value] })),
						]}
					/>
				</div>
				<div>
					<span>{t.category}</span>
					<SelectControl
						label={t.category}
						value={category}
						onChange={(value) => {
							setCategory(value);
							setCursor(null);
						}}
						options={[
							{ value: "", label: t.all },
							...reportCategories.map((value) => ({ value, label: t[value] })),
						]}
					/>
				</div>
			</div>
			{error ? (
				<div role="alert">
					<p>{error}</p>
					<button
						type="button"
						className={styles.secondary}
						onClick={() => setVersion((v) => v + 1)}
					>
						{t.retry}
					</button>
				</div>
			) : !page ? (
				<p role="status">{t.loading}</p>
			) : page.items.length === 0 ? (
				<p>{t.empty}</p>
			) : (
				<ul className={reportStyles.queue}>
					{page.items.map((report) => (
						<li key={report.id}>
							<Link href={localeHref(locale, `/admin/reports/${report.id}`)}>
								<strong dir="auto">{report.slug}</strong>
								<span>
									{t[report.category]} · {t[report.status]}
								</span>
								<time dateTime={report.createdAt}>
									{new Date(report.createdAt).toLocaleString(locale)}
								</time>
								<p dir="auto">{report.message}</p>
							</Link>
						</li>
					))}
				</ul>
			)}
			<div className={styles.actions}>
				{cursor && (
					<button type="button" className={styles.secondary} onClick={() => setCursor(null)}>
						{t.first}
					</button>
				)}
				{page?.nextCursor && (
					<button
						type="button"
						className={styles.primary}
						onClick={() => setCursor(page.nextCursor)}
					>
						{t.next}
					</button>
				)}
			</div>
		</section>
	);
}

/** Handles report state independently from the existing password-protected site moderation dialog. */
export function AdminReportDetail({ id }: { id: string }) {
	const { locale, permissions } = useAdminSession(),
		t = adminCopy[locale].report;
	const [report, setReport] = useState<ContentReport | null>(null),
		[error, setError] = useState(""),
		[busy, setBusy] = useState(false),
		[note, setNote] = useState(""),
		[notice, setNotice] = useState(""),
		[version, setVersion] = useState(0);
	const pending = useRef(false),
		epoch = useRef(0),
		controller = useSiteModeration(locale);
	useEffect(() => {
		const current = ++epoch.current;
		setReport(null);
		setBusy(false);
		setError("");
		setNotice("");
		setNote("");
		void version;
		api<ContentReport>(`/api/admin/reports/${encodeURIComponent(id)}`)
			.then((value) => {
				if (current === epoch.current) {
					setReport(value);
					setNote(value.resolutionNote ?? "");
				}
			})
			.catch((e) => {
				if (current === epoch.current) setError(errorText(e, locale));
			});
		return () => {
			epoch.current++;
		};
	}, [id, locale, version]);
	/** Applies only a confirmed server transition and refuses stale completion work. */
	async function transition(status: "reviewing" | "dismissed" | "actioned") {
		if (pending.current || !report) return;
		pending.current = true;
		setBusy(true);
		setError("");
		setNotice("");
		const current = epoch.current;
		try {
			const value = await api<ContentReport>(`/api/admin/reports/${report.id}/status`, "POST", {
				status,
				...(note.trim() ? { resolutionNote: note.trim() } : {}),
			});
			if (current === epoch.current) {
				setReport(value);
				setNotice(t.saved);
			}
		} catch (e) {
			if (current === epoch.current)
				setError(
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
	return (
		<section className={reportStyles.page}>
			<Link href={localeHref(locale, "/admin/reports")}>{t.back}</Link>
			<h1>{t.details}</h1>
			{error && (
				<div role="alert">
					<p>{error}</p>
					<button
						type="button"
						className={styles.secondary}
						disabled={busy}
						onClick={() => setVersion((v) => v + 1)}
					>
						{t.retry}
					</button>
				</div>
			)}
			{!report && !error && <p role="status">{t.loading}</p>}
			{report && (
				<>
					<dl className={styles.detailsList}>
						<div>
							<dt>{t.status}</dt>
							<dd>{t[report.status]}</dd>
						</div>
						<div>
							<dt>{t.category}</dt>
							<dd>{t[report.category]}</dd>
						</div>
						<div>
							<dt>{t.reporter}</dt>
							<dd dir="ltr">{report.reporterEmail ?? "—"}</dd>
						</div>
						<div>
							<dt>{t.created}</dt>
							<dd>
								<time dateTime={report.createdAt}>
									{new Date(report.createdAt).toLocaleString(locale)}
								</time>
							</dd>
						</div>
					</dl>
					<p dir="auto" className={reportStyles.message}>
						{report.message}
					</p>
					<a href={`/p/${encodeURIComponent(report.slug)}`}>
						{t.site} <bdi>{report.slug}</bdi>
					</a>
					{report.resolutionNote && <p dir="auto">{report.resolutionNote}</p>}
					{closed ? (
						<p>{t.closed}</p>
					) : (
						canHandle && (
							<div className={reportStyles.handling}>
								<label>
									{t.note}
									<textarea
										value={note}
										onChange={(e) => setNote(e.target.value)}
										minLength={10}
										maxLength={500}
										dir="auto"
										rows={4}
										disabled={busy || controller.busy}
									/>
								</label>
								<div className={styles.actions}>
									<button
										type="button"
										className={styles.secondary}
										disabled={
											busy ||
											controller.busy ||
											report.status === "reviewing" ||
											Boolean(note.trim() && !validNote)
										}
										onClick={() => void transition("reviewing")}
									>
										{t.review}
									</button>
									<button
										type="button"
										className={styles.secondary}
										disabled={busy || controller.busy || !validNote}
										onClick={() => void transition("dismissed")}
									>
										{t.dismiss}
									</button>
									{permissions.includes("site.suspend") && (
										<button
											type="button"
											className={styles.danger}
											disabled={busy || controller.busy}
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
									<button
										type="button"
										className={styles.primary}
										disabled={busy || controller.busy || !validNote}
										onClick={() => void transition("actioned")}
									>
										{t.closeActioned}
									</button>
								</div>
								<p>{t.actionHelp}</p>
							</div>
						)
					)}
				</>
			)}
			{notice && <p role="status">{notice}</p>}
			{controller.error && !controller.details && <p role="alert">{controller.error}</p>}
			{controller.notice && <p role="status">{controller.notice}</p>}
			<SiteModerationDialog controller={controller} locale={locale} />
		</section>
	);
}
