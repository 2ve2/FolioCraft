"use client";
import type { Locale } from "@ichnara/contracts";
import {
	ExternalLink,
	Flag,
	Globe2,
	History,
	Lock,
	MonitorSmartphone,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { api } from "../../../lib/api";
import { localeHref } from "../../../lib/locale";
import { date, errorText } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite, AdminUser } from "../shared/types";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { AdminDialog } from "./admin-dialog";
import { useAdminData, useAdminList, useAdminRefresh } from "./admin-query";
import { directoryCopy } from "./directory-copy";
import { operationsCopy } from "./operations-copy";
import { SiteModerationDialog } from "./site-moderation-dialog";
import {
	Avatar,
	type Column,
	DataTable,
	FilterSelect,
	KeyValues,
	PageHeader,
	Panel,
	RecordState,
	SearchField,
	StateMessage,
	StatusBadge,
	Toolbar,
	ui,
	useDebouncedValue,
} from "./ui/console";
import { useSiteModeration } from "./use-site-moderation";

type DirectoryRow = AdminUser & AdminSite;

/** Account role as a badge; staff roles stand out from ordinary members. */
export function RoleBadge({ role, locale }: { role?: string | null; locale: Locale }) {
	const roles = directoryCopy[locale].roles;
	const names = (role || "user").split(",").map((value) => value.trim());
	return (
		<StatusBadge tone={names.some((name) => name !== "user") ? "info" : "neutral"}>
			{names.map((name) => roles[name as keyof typeof roles] ?? name).join(" · ")}
		</StatusBadge>
	);
}

/** Directory of accounts or sites: masked identity, server filters and keyset paging as one list. */
export function AdminDirectory({ kind }: { kind: "accounts" | "sites" }) {
	const { locale } = useAdminSession(),
		t = directoryCopy[locale];
	const [filters, setFilters] = useState<Record<string, string>>({});
	const [search, setSearch] = useState("");
	const settledSearch = useDebouncedValue(search.trim());
	const query = new URLSearchParams({
		limit: "20",
		...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
	});
	if (kind === "accounts" && settledSearch) query.set("search", settledSearch);
	const list = useAdminList<DirectoryRow>(
		`/api/admin/${kind === "accounts" ? "users" : "sites"}?${query}`,
		"cursor",
		locale,
	);
	const filtered = Boolean(settledSearch) || Object.values(filters).some(Boolean);
	const yesNo = [
		{ value: "", label: t.all },
		{ value: "true", label: t.yes },
		{ value: "false", label: t.no },
	];
	const change = (key: string) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));
	const href = (row: DirectoryRow) =>
		localeHref(locale, `/admin/${kind}/${encodeURIComponent(row.id)}`);
	const columns: Column<DirectoryRow>[] =
		kind === "accounts"
			? [
					{
						key: "account",
						header: t.account,
						primary: true,
						cell: (row) => (
							<div className={ui.primaryCell}>
								<Avatar name={row.name} />
								<div className={ui.primaryText}>
									<Link className={ui.cellLink} href={href(row)} dir="auto">
										{row.name}
									</Link>
									<span dir="ltr">{row.email}</span>
								</div>
							</div>
						),
					},
					{
						key: "role",
						header: t.role,
						cell: (row) => <RoleBadge role={row.role} locale={locale} />,
					},
					{
						key: "status",
						header: t.status,
						cell: (row) => (
							<StatusBadge tone={row.banned ? "danger" : "success"}>
								{row.banned ? t.banned : t.active}
							</StatusBadge>
						),
					},
					{
						key: "email",
						header: t.emailStatus,
						cell: (row) => (
							<StatusBadge tone={row.emailVerified ? "success" : "warning"}>
								{row.emailVerified ? t.verified : t.unverified}
							</StatusBadge>
						),
					},
					{ key: "sites", header: t.sites, align: "end", cell: (row) => row.siteCount ?? 0 },
					{
						key: "created",
						header: t.created,
						cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
					},
				]
			: [
					{
						key: "site",
						header: t.site,
						primary: true,
						cell: (row) => (
							<div className={ui.primaryText}>
								<Link className={ui.cellLink} href={href(row)} dir="ltr">
									{row.slug}
								</Link>
								<span dir="ltr">/p/{row.slug}</span>
							</div>
						),
					},
					{
						key: "publication",
						header: t.publication,
						cell: (row) => (
							<StatusBadge tone={row.publishedReleaseId ? "success" : "neutral"}>
								{row.publishedReleaseId ? t.published : t.notPublished}
							</StatusBadge>
						),
					},
					{
						key: "moderation",
						header: t.moderation,
						cell: (row) => (
							<StatusBadge tone={row.suspended ? "danger" : "success"}>
								{row.suspended ? t.suspended : t.active}
							</StatusBadge>
						),
					},
					{
						key: "created",
						header: t.created,
						cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
					},
				];
	return (
		<section className={ui.page}>
			<PageHeader
				title={t[kind]}
				description={kind === "accounts" ? t.accountsIntro : t.sitesIntro}
			/>
			<Panel padded={false}>
				<Toolbar
					locale={locale}
					active={filtered}
					onClear={() => {
						setFilters({});
						setSearch("");
					}}
				>
					{kind === "accounts" ? (
						<>
							<SearchField label={t.search} value={search} onChange={setSearch} />
							<FilterSelect
								label={t.role}
								value={filters.role ?? ""}
								onChange={change("role")}
								options={[
									{ value: "", label: t.all },
									...(["user", "owner", "moderator", "support", "analyst"] as const).map(
										(value) => ({ value, label: t.roles[value] }),
									),
								]}
							/>
							<FilterSelect
								label={t.banned}
								value={filters.banned ?? ""}
								onChange={change("banned")}
								options={yesNo}
							/>
							<FilterSelect
								label={t.verified}
								value={filters.verified ?? ""}
								onChange={change("verified")}
								options={yesNo}
							/>
						</>
					) : (
						(["published", "suspended", "reported"] as const).map((key) => (
							<FilterSelect
								key={key}
								label={t[key]}
								value={filters[key] ?? ""}
								onChange={change(key)}
								options={yesNo}
							/>
						))
					)}
				</Toolbar>
				<DataTable
					label={t[kind]}
					columns={columns}
					rows={list.items}
					rowKey={(row) => row.id}
					rowHref={href}
					state={list}
					locale={locale}
					filtered={filtered}
					empty={{ icon: kind === "accounts" ? UsersRound : Globe2 }}
				/>
			</Panel>
		</section>
	);
}
type RelatedRow = {
	id: string;
	slug?: string;
	action: string;
	status: string;
	category?: string;
	createdAt: string;
	reason?: string | null;
	publishedReleaseId?: string | null;
	suspended?: boolean;
};

/** Report status tones shared by every report list. */
export const reportTone = {
	open: "warning",
	reviewing: "info",
	actioned: "success",
	dismissed: "neutral",
} as const;

/** A related list inside a detail page: its own permission, paging and empty text. */
function Related({ type, filter }: { type: "sites" | "reports" | "audit"; filter: string }) {
	const { locale, permissions } = useAdminSession(),
		t = directoryCopy[locale],
		r = adminCopy[locale].report,
		o = operationsCopy[locale];
	const allowed = permissions.includes(
		type === "audit" ? "audit.read" : type === "reports" ? "report.read" : "site.read",
	);
	const list = useAdminList<RelatedRow>(
		allowed ? `/api/admin/${type}?limit=20&${filter}` : null,
		type === "audit" ? "offset" : "cursor",
		locale,
	);
	if (!allowed) return <StateMessage icon={Lock} title={t.unavailable} />;
	const rows =
		type === "audit"
			? list.items.filter((row) => ["site.suspend", "site.resume"].includes(row.action))
			: list.items;
	const columns: Column<RelatedRow>[] =
		type === "audit"
			? [
					{
						key: "action",
						header: o.action,
						primary: true,
						cell: (row) => (
							<div className={ui.primaryText}>
								<strong>{row.action === "site.suspend" ? t.suspended : t.active}</strong>
								{row.reason && <span dir="auto">{row.reason}</span>}
							</div>
						),
					},
					{
						key: "status",
						header: t.status,
						cell: (row) => (
							<StatusBadge
								tone={
									row.status === "succeeded"
										? "success"
										: row.status === "failed"
											? "danger"
											: "neutral"
								}
							>
								{o[row.status as "succeeded"] ?? row.status}
							</StatusBadge>
						),
					},
					{
						key: "created",
						header: t.created,
						cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
					},
				]
			: type === "reports"
				? [
						{
							key: "site",
							header: t.site,
							primary: true,
							cell: (row) => (
								<div className={ui.primaryText}>
									<Link
										className={ui.cellLink}
										href={localeHref(locale, `/admin/reports/${row.id}`)}
										dir="ltr"
									>
										{row.slug}
									</Link>
									<span>{r[row.category as "spam"] ?? row.category}</span>
								</div>
							),
						},
						{
							key: "status",
							header: t.status,
							cell: (row) => (
								<StatusBadge tone={reportTone[row.status as "open"] ?? "neutral"}>
									{r[row.status as "open"] ?? row.status}
								</StatusBadge>
							),
						},
						{
							key: "created",
							header: r.created,
							cell: (row) => <span className={ui.muted}>{date(row.createdAt, locale)}</span>,
						},
					]
				: [
						{
							key: "site",
							header: t.site,
							primary: true,
							cell: (row) => (
								<Link
									className={ui.cellLink}
									href={localeHref(locale, `/admin/sites/${row.id}`)}
									dir="ltr"
								>
									{row.slug}
								</Link>
							),
						},
						{
							key: "publication",
							header: t.publication,
							cell: (row) => (
								<StatusBadge tone={row.publishedReleaseId ? "success" : "neutral"}>
									{row.publishedReleaseId ? t.published : t.notPublished}
								</StatusBadge>
							),
						},
						{
							key: "moderation",
							header: t.moderation,
							cell: (row) => (
								<StatusBadge tone={row.suspended ? "danger" : "success"}>
									{row.suspended ? t.suspended : t.active}
								</StatusBadge>
							),
						},
					];
	return (
		<DataTable
			label={type === "audit" ? t.history : type === "reports" ? t.reports : t.sites}
			columns={columns}
			rows={rows}
			rowKey={(row) => row.id}
			rowHref={
				type === "audit"
					? undefined
					: (row) => localeHref(locale, `/admin/${type}/${encodeURIComponent(row.id)}`)
			}
			state={list}
			locale={locale}
			empty={{
				icon: type === "audit" ? History : type === "reports" ? Flag : Globe2,
				title: type === "audit" ? t.noHistory : type === "reports" ? t.noReports : t.noSites,
			}}
		/>
	);
}

/** Account actions call only the existing independently secured native/domain pipelines. */
export function AdminAccountDetail({ id }: { id: string }) {
	const refresh = useAdminRefresh();
	const { locale, permissions } = useAdminSession(),
		t = directoryCopy[locale];
	const state = useAdminData<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`, locale),
		sessions = useAdminData<{ items: { id: string; createdAt: string; expiresAt: string }[] }>(
			`/api/admin/users/${encodeURIComponent(id)}/sessions`,
			locale,
		);
	const heading = useRef<HTMLHeadingElement>(null);
	const [action, setAction] = useState(""),
		[reason, setReason] = useState(""),
		[password, setPassword] = useState(""),
		[confirmationId, setConfirmationId] = useState(""),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(""),
		[notice, setNotice] = useState(""),
		[email, setEmail] = useState("");
	const ordinary = state.data?.role?.trim() === "user";
	function choose(value: string) {
		setAction(value);
		setReason("");
		setPassword("");
		setConfirmationId("");
		setError("");
		setEmail("");
		setNotice("");
	}
	async function submit() {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			const result = await api<{ email?: string }>(
				`/api/admin/users/${encodeURIComponent(id)}/${action}`,
				"POST",
				{
					reason: reason.trim(),
					password,
					...(action === "remove" ? { confirmation: confirmationId } : {}),
				},
			);
			setEmail(result.email ?? "");
			setNotice(t.saved);
			setAction("");
			if (action !== "remove") {
				refresh();
			} else {
				window.location.assign(localeHref(locale, "/admin/accounts"));
			}
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setPassword("");
			setBusy(false);
		}
	}
	const controls = [
		[
			state.data?.banned ? "unban" : "ban",
			state.data?.banned ? t.unban : t.ban,
			state.data?.banned ? "user.unban" : "user.ban",
		],
		["revoke-sessions", t.revokeAll, "user.revoke_session"],
		["reveal-email", t.reveal, "user.read_email"],
		["remove", t.remove, "user.remove"],
	] as const;
	const user = state.data;
	const canRevoke = ordinary && permissions.includes("user.revoke_session");
	return (
		<section className={ui.page}>
			<PageHeader
				back={{ href: localeHref(locale, "/admin/accounts"), label: t.accounts }}
				title={user?.name ?? t.accountDetails}
				badges={
					user && (
						<>
							<RoleBadge role={user.role} locale={locale} />
							<StatusBadge tone={user.banned ? "danger" : "success"}>
								{user.banned ? t.banned : t.active}
							</StatusBadge>
						</>
					)
				}
				actions={
					user &&
					ordinary &&
					controls
						.filter(([, , permission]) => permissions.includes(permission))
						.map(([value, label]) => (
							<button
								key={value}
								type="button"
								className={value === "remove" ? ui.buttonDanger : ui.button}
								onClick={() => choose(value)}
							>
								{label}
							</button>
						))
				}
			/>
			{notice && (
				<p className={ui.banner} role="status">
					{notice}
				</p>
			)}
			{email && (
				<p className={ui.banner} data-tone="info" dir="ltr">
					{email}
				</p>
			)}
			{user && !ordinary && (
				<p className={ui.banner} data-tone="info">
					{t.ordinary}
				</p>
			)}
			<RecordState state={state} locale={locale}>
				{user && (
					<div className={ui.grid2}>
						<div className={ui.stack}>
							<Panel title={t.sites} padded={false}>
								<Related type="sites" filter={`ownerId=${encodeURIComponent(id)}`} />
							</Panel>
							<Panel title={t.reports} padded={false}>
								<Related type="reports" filter={`ownerId=${encodeURIComponent(id)}`} />
							</Panel>
						</div>
						<div className={ui.stack}>
							<Panel title={t.identity}>
								<KeyValues
									items={[
										{ label: t.accountId, value: id, mono: true },
										{ label: t.emailStatus, value: <span dir="ltr">{user.email}</span> },
										{
											label: t.verified,
											value: (
												<StatusBadge tone={user.emailVerified ? "success" : "warning"}>
													{user.emailVerified ? t.verified : t.unverified}
												</StatusBadge>
											),
										},
										{ label: t.created, value: date(user.createdAt, locale) },
									]}
								/>
							</Panel>
							<Panel title={t.sessions} padded={false}>
								<DataTable
									label={t.sessions}
									columns={[
										{
											key: "session",
											header: t.sessionId,
											primary: true,
											cell: (row) => (
												<div className={ui.primaryText}>
													<span className={ui.mono} dir="ltr">
														{row.id.slice(0, 12)}…
													</span>
													<span>
														{t.expires}: {date(row.expiresAt, locale)}
													</span>
												</div>
											),
										},
										...(canRevoke
											? [
													{
														key: "revoke",
														header: t.actions,
														align: "end" as const,
														cell: (row: { id: string }) => (
															<button
																type="button"
																className={ui.buttonGhost}
																onClick={() =>
																	choose(`sessions/${encodeURIComponent(row.id)}/revoke`)
																}
															>
																{t.revoke}
															</button>
														),
													},
												]
											: []),
									]}
									rows={sessions.data?.items ?? []}
									rowKey={(row) => row.id}
									state={{
										loaded: Boolean(sessions.data),
										error: sessions.error,
										reload: sessions.reload,
									}}
									locale={locale}
									empty={{ icon: MonitorSmartphone, title: t.noSessions }}
								/>
							</Panel>
						</div>
					</div>
				)}
			</RecordState>
			{action && (
				<AdminDialog
					headingRef={heading}
					title={controls.find(([v]) => v === action)?.[1] ?? t.revoke}
					locale={locale}
					busy={busy}
					onClose={() => choose("")}
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
						{action === "remove" && <p className={ui.description}>{t.removeWarning}</p>}
						<label className={ui.field}>
							{t.reason}
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
							{t.password}
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
						{action === "remove" && (
							<label className={ui.field}>
								{t.confirm}
								<input
									className={ui.input}
									dir="ltr"
									required
									value={confirmationId}
									onChange={(e) => setConfirmationId(e.target.value)}
								/>
							</label>
						)}
						<button
							type="submit"
							className={
								action === "remove" || action === "ban" ? ui.buttonDanger : ui.buttonPrimary
							}
							disabled={
								busy ||
								reason.trim().length < 10 ||
								!password ||
								(action === "remove" && confirmationId !== id)
							}
						>
							<ButtonContent loading={busy}>{t.submit}</ButtonContent>
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}

/** Site detail selects published metadata only; moderation shares the existing password dialog. */
export function AdminSiteDetail({ id }: { id: string }) {
	const { locale, permissions } = useAdminSession(),
		t = directoryCopy[locale];
	const c = useSiteModeration(locale),
		state = useAdminData<AdminSite>(`/api/admin/sites/${encodeURIComponent(id)}`, locale),
		site = state.data;
	const canModerate = site && permissions.includes(site.suspended ? "site.resume" : "site.suspend");
	return (
		<section className={ui.page}>
			<PageHeader
				back={{ href: localeHref(locale, "/admin/sites"), label: t.sites }}
				title={site ? <span dir="ltr">{site.slug}</span> : t.siteDetails}
				badges={
					site && (
						<>
							<StatusBadge tone={site.publishedReleaseId ? "success" : "neutral"}>
								{site.publishedReleaseId ? t.published : t.notPublished}
							</StatusBadge>
							<StatusBadge tone={site.suspended ? "danger" : "success"}>
								{site.suspended ? t.suspended : t.active}
							</StatusBadge>
						</>
					)
				}
				actions={
					site && (
						<>
							{site.publishedReleaseId && (
								<a className={ui.button} href={`/p/${site.slug}`} target="_blank" rel="noreferrer">
									{t.publicLink}
									<ExternalLink size={15} aria-hidden="true" />
								</a>
							)}
							{canModerate && (
								<button
									type="button"
									className={site.suspended ? ui.buttonPrimary : ui.buttonDanger}
									disabled={c.busy}
									onClick={() => c.openSiteDetails({ id })}
								>
									{site.suspended ? text[locale].resume : text[locale].suspend}
								</button>
							)}
						</>
					)
				}
			/>
			{c.error && !c.details && (
				<p className={ui.banner} data-tone="danger" role="alert">
					{c.error}
				</p>
			)}
			{c.notice && (
				<p className={ui.banner} role="status">
					{c.notice}
				</p>
			)}
			<RecordState state={state} locale={locale}>
				{site && (
					<div className={ui.grid2}>
						<div className={ui.stack}>
							<Panel title={t.reports} padded={false}>
								<Related type="reports" filter={`siteId=${encodeURIComponent(id)}`} />
							</Panel>
							{/* Roles without the activity log do not get an empty "unavailable" panel. */}
							{permissions.includes("audit.read") && (
								<Panel title={t.history} padded={false}>
									<Related
										type="audit"
										filter={`targetType=site&targetId=${encodeURIComponent(id)}`}
									/>
								</Panel>
							)}
						</div>
						<Panel title={t.siteDetails}>
							<KeyValues
								items={[
									{ label: t.siteId, value: id, mono: true },
									{
										label: t.owner,
										value: (
											<Link
												className={ui.cellLink}
												href={localeHref(
													locale,
													`/admin/accounts/${encodeURIComponent(site.ownerId)}`,
												)}
											>
												<span className={ui.mono} dir="ltr">
													{site.ownerId}
												</span>
											</Link>
										),
									},
									{ label: t.locale, value: site.locale ?? t.privateLocale },
									{
										label: t.publication,
										value: site.publishedAt ? date(site.publishedAt, locale) : "—",
									},
									{ label: t.created, value: date(site.createdAt, locale) },
									{ label: t.releases, value: site.releaseCount },
									{ label: t.ready, value: site.readyImages },
									{ label: t.pending, value: site.pendingImages },
									{ label: t.suspended, value: site.suspensionReason, hidden: !site.suspended },
								]}
							/>
						</Panel>
					</div>
				)}
			</RecordState>
			<SiteModerationDialog controller={c} locale={locale} />
		</section>
	);
}
