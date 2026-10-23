"use client";
import { noticeInput, type SystemNotice } from "@ichnara/contracts";
import { Megaphone, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { api } from "../../../lib/api";
import { date, errorText } from "../shared";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { useAdminList, useAdminRefresh } from "./admin-query";
import { directoryCopy } from "./directory-copy";
import { operationsCopy } from "./operations-copy";
import {
	type Column,
	DataTable,
	FilterSelect,
	PageHeader,
	Panel,
	StatusBadge,
	type Tone,
	ui,
} from "./ui/console";

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
const kindTone: Record<SystemNotice["kind"], Tone> = {
	info: "info",
	maintenance: "warning",
	incident: "danger",
};

/** Where a notice stands now: disabled, waiting for its window, showing, or past its window. */
function noticeState(row: SystemNotice, now = Date.now()) {
	if (!row.active) return "disabled" as const;
	if (now < new Date(row.startsAt).getTime()) return "scheduled" as const;
	if (now > new Date(row.endsAt).getTime()) return "ended" as const;
	return "live" as const;
}
const stateTone = {
	live: "success",
	scheduled: "info",
	ended: "neutral",
	disabled: "neutral",
} as const;
/** Every create/edit/disable is acknowledged by the actual audited backend operation. */
export function AdminNotices() {
	const refresh = useAdminRefresh();
	const { locale, permissions } = useAdminSession(),
		t = operationsCopy[locale],
		d = directoryCopy[locale];
	const [selected, setSelected] = useState<"create" | SystemNotice | null>(null),
		[disabling, setDisabling] = useState(false),
		[draft, setDraft] = useState(blank),
		[reason, setReason] = useState(""),
		[password, setPassword] = useState(""),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(""),
		[notice, setNotice] = useState("");
	const heading = useRef<HTMLHeadingElement>(null);
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
			refresh();
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setBusy(false);
			setPassword("");
		}
	}
	const list = useAdminList<SystemNotice>("/api/admin/notices?limit=20", "offset", locale);
	const columns: Column<SystemNotice>[] = [
		{
			key: "message",
			header: t.message,
			primary: true,
			cell: (row) => (
				<div className={ui.primaryText}>
					<StatusBadge tone={kindTone[row.kind]}>{t[row.kind]}</StatusBadge>
					<span className={ui.clip} dir="auto">
						{locale === "ar" ? row.messageAr : row.messageEn}
					</span>
				</div>
			),
		},
		{
			key: "state",
			header: t.status,
			cell: (row) => {
				const current = noticeState(row);
				return <StatusBadge tone={stateTone[current]}>{t[current]}</StatusBadge>;
			},
		},
		{
			key: "window",
			header: t.window,
			cell: (row) => (
				<span className={ui.muted}>
					{date(row.startsAt, locale)} – {date(row.endsAt, locale)}
				</span>
			),
		},
		...(canManage
			? [
					{
						key: "actions",
						header: d.actions,
						align: "end" as const,
						cell: (row: SystemNotice) => (
							<span className={ui.headerActions}>
								<button type="button" className={ui.buttonGhost} onClick={() => choose(row)}>
									{t.edit}
								</button>
								{row.active && (
									<button
										type="button"
										className={ui.buttonGhost}
										onClick={() => choose(row, true)}
									>
										{t.disable}
									</button>
								)}
							</span>
						),
					},
				]
			: []),
	];
	return (
		<section className={ui.page}>
			<PageHeader
				title={t.notices}
				description={t.noticesIntro}
				actions={
					canManage && (
						<button type="button" className={ui.buttonPrimary} onClick={() => choose("create")}>
							<Plus size={16} aria-hidden="true" />
							{t.create}
						</button>
					)
				}
			/>
			{notice && (
				<p className={ui.banner} role="status">
					{notice}
				</p>
			)}
			<Panel padded={false}>
				<DataTable
					label={t.notices}
					columns={columns}
					rows={list.items}
					rowKey={(row) => row.id}
					state={list}
					locale={locale}
					empty={{ icon: Megaphone, title: t.noNotices, text: t.noticeHelp }}
				/>
			</Panel>
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
						className={ui.form}
						onSubmit={(e) => {
							e.preventDefault();
							void submit();
						}}
					>
						{error && (
							<p className={ui.banner} data-tone="danger" role="alert">
								{error}
							</p>
						)}
						{!disabling && (
							<>
								<FilterSelect
									label={t.kind}
									value={draft.kind}
									onChange={(v) => {
										if (v) setDraft({ ...draft, kind: v as SystemNotice["kind"] });
									}}
									options={(["info", "maintenance", "incident"] as const).map((value) => ({
										value,
										label: t[value],
									}))}
								/>
								{(["messageAr", "messageEn"] as const).map((key) => (
									<label className={ui.field} key={key}>
										{t[key]}
										<textarea
											className={ui.input}
											required
											lang={key === "messageAr" ? "ar" : "en"}
											dir={key === "messageAr" ? "rtl" : "ltr"}
											minLength={1}
											maxLength={1000}
											value={draft[key]}
											onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
										/>
									</label>
								))}
								<div className={ui.fieldRow}>
									{(["startsAt", "endsAt"] as const).map((key) => (
										<label className={ui.field} key={key}>
											{t[key]}
											<input
												className={ui.input}
												required
												type="datetime-local"
												value={draft[key]}
												min={key === "endsAt" ? draft.startsAt : undefined}
												onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
											/>
										</label>
									))}
								</div>
								<label className={ui.check}>
									<input
										type="checkbox"
										checked={draft.active}
										onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
									/>
									{t.active}
								</label>
								<section className={ui.previewBox} aria-label={t.preview}>
									<h3 className={ui.panelTitle}>{t.preview}</h3>
									<p lang="ar" dir="rtl">
										{draft.messageAr}
									</p>
									<p lang="en" dir="ltr">
										{draft.messageEn}
									</p>
								</section>
							</>
						)}
						<label className={ui.field}>
							{d.reason}
							<textarea
								className={ui.input}
								required
								dir="auto"
								minLength={10}
								maxLength={500}
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
							className={disabling ? ui.buttonDanger : ui.buttonPrimary}
							type="submit"
							disabled={
								busy ||
								reason.trim().length < 10 ||
								!password ||
								(!disabling && new Date(draft.endsAt) <= new Date(draft.startsAt))
							}
						>
							<ButtonContent loading={busy}>{d.submit}</ButtonContent>
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
