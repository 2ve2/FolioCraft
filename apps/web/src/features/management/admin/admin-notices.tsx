"use client";
import { noticeInput, type SystemNotice } from "@ichnara/contracts";
import { useRef, useState } from "react";
import { api } from "../../../lib/api";
import { date, errorText } from "../shared";
import type { Page } from "../shared/types";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { DirectoryFilter, ReadState, useAdminData } from "./admin-directory";
import { AdminPagination } from "./admin-lists";
import { directoryCopy } from "./directory-copy";
import fields from "./operations.module.css";
import { operationsCopy } from "./operations-copy";
import layout from "./reports.module.css";

const localTime = (value: string) => {
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const blank = () => ({
	kind: "info" as SystemNotice["kind"],
	messageAr: "",
	messageEn: "",
	startsAt: localTime(new Date().toISOString()),
	endsAt: localTime(new Date(Date.now() + 3600000).toISOString()),
	active: false,
});
/** Every create/edit/disable is acknowledged by the actual audited backend operation. */
export function AdminNotices() {
	const { locale, permissions } = useAdminSession(),
		t = operationsCopy[locale],
		d = directoryCopy[locale];
	const [offset, setOffset] = useState(0),
		[selected, setSelected] = useState<"create" | SystemNotice | null>(null),
		[disabling, setDisabling] = useState(false),
		[draft, setDraft] = useState(blank),
		[reason, setReason] = useState(""),
		[password, setPassword] = useState(""),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(""),
		[notice, setNotice] = useState("");
	const heading = useRef<HTMLHeadingElement>(null),
		state = useAdminData<Page<SystemNotice>>(
			`/api/admin/notices?limit=20&offset=${offset}`,
			locale,
		);
	const canManage = permissions.includes("notice.manage");
	function choose(row: "create" | SystemNotice, disable = false) {
		setSelected(row);
		setDisabling(disable);
		setDraft(
			row === "create"
				? blank()
				: {
						kind: row.kind,
						messageAr: row.messageAr,
						messageEn: row.messageEn,
						active: row.active,
						startsAt: localTime(row.startsAt),
						endsAt: localTime(row.endsAt),
					},
		);
		setReason("");
		setPassword("");
		setError("");
		setNotice("");
	}
	async function submit() {
		if (busy || !selected) return;
		setBusy(true);
		setError("");
		try {
			const value = disabling
				? null
				: noticeInput.parse({
						...draft,
						startsAt: new Date(draft.startsAt).toISOString(),
						endsAt: new Date(draft.endsAt).toISOString(),
					});
			await api(
				selected === "create"
					? "/api/admin/notices"
					: `/api/admin/notices/${selected.id}${disabling ? "/disable" : ""}`,
				selected === "create" || disabling ? "POST" : "PATCH",
				{ reason: reason.trim(), password, ...(value ? { notice: value } : {}) },
			);
			setSelected(null);
			setNotice(d.saved);
			state.reload();
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setBusy(false);
			setPassword("");
		}
	}
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t.notices}</h1>
			<p>{t.noticeHelp}</p>
			{canManage && (
				<button type="button" className={styles.primary} onClick={() => choose("create")}>
					{t.create}
				</button>
			)}
			{notice && <p role="status">{notice}</p>}
			<ReadState state={state}>
				<ul className={layout.queue}>
					{state.data?.items.map((row) => (
						<li key={row.id}>
							<h2>{t[row.kind]}</h2>
							<p dir="auto">{locale === "ar" ? row.messageAr : row.messageEn}</p>
							<p>
								{t.active}: {row.active ? d.yes : d.no}
							</p>
							<p>
								{date(row.startsAt, locale)} — {date(row.endsAt, locale)}
							</p>
							{canManage && (
								<div className={styles.actions}>
									<button type="button" className={styles.secondary} onClick={() => choose(row)}>
										{t.edit}
									</button>
									<button
										type="button"
										className={styles.danger}
										disabled={!row.active}
										onClick={() => choose(row, true)}
									>
										{t.disable}
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
				{!state.data?.items.length && <p>{d.empty}</p>}
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
					headingRef={heading}
					title={disabling ? t.disable : selected === "create" ? t.create : t.edit}
					locale={locale}
					busy={busy}
					onClose={() => {
						setSelected(null);
						setPassword("");
					}}
				>
					<form
						className={fields.page}
						onSubmit={(e) => {
							e.preventDefault();
							void submit();
						}}
					>
						{error && <p role="alert">{error}</p>}
						{!disabling && (
							<>
								<DirectoryFilter
									label={t.kind}
									value={draft.kind}
									change={(v) => {
										if (v) setDraft({ ...draft, kind: v as SystemNotice["kind"] });
									}}
									choices={(["info", "maintenance", "incident"] as const).map((value) => ({
										value,
										label: t[value],
									}))}
								/>
								{(["messageAr", "messageEn"] as const).map((key) => (
									<label key={key}>
										{t[key]}
										<textarea
											required
											aria-label={t[key]}
											lang={key === "messageAr" ? "ar" : "en"}
											dir={key === "messageAr" ? "rtl" : "ltr"}
											minLength={1}
											maxLength={1000}
											value={draft[key]}
											onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
										/>
									</label>
								))}
								{(["startsAt", "endsAt"] as const).map((key) => (
									<label key={key}>
										{t[key]}
										<input
											required
											type="datetime-local"
											value={draft[key]}
											min={key === "endsAt" ? draft.startsAt : undefined}
											onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
										/>
									</label>
								))}
								<label>
									{t.active}
									<input
										type="checkbox"
										checked={draft.active}
										onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
									/>
								</label>
								<section aria-label={t.preview}>
									<h3>{t.preview}</h3>
									<p lang="ar" dir="rtl">
										{draft.messageAr}
									</p>
									<p lang="en" dir="ltr">
										{draft.messageEn}
									</p>
								</section>
							</>
						)}
						<label>
							{d.reason}
							<textarea
								required
								dir="auto"
								minLength={10}
								maxLength={500}
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
							disabled={
								busy ||
								reason.trim().length < 10 ||
								!password ||
								(!disabling && new Date(draft.endsAt) <= new Date(draft.startsAt))
							}
						>
							{d.submit}
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
