"use client";
import type { Locale } from "@ichnara/contracts";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SelectControl } from "../../../components/ui/select-control";
import { api } from "../../../lib/api";
import { localeHref } from "../../../lib/locale";
import { date, errorText } from "../shared";
import type { AdminSite, AdminUser } from "../shared/types";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { AdminDialog } from "./admin-dialog";
import { AdminPagination } from "./admin-lists";
import { AdminManagementDialogs } from "./admin-management-dialogs";
import { directoryCopy } from "./directory-copy";
import fields from "./operations.module.css";
import layout from "./reports.module.css";
import { useAdminController } from "./use-admin-controller";

export type CursorPage<T> = { items: T[]; nextCursor: string | null };
/** Discards superseded reads and exposes explicit retry without replaying writes. */
export function useAdminData<T>(path: string | null, locale: Locale) {
	const [data, setData] = useState<T | null>(null),
		[error, setError] = useState(""),
		[version, setVersion] = useState(0);
	useEffect(() => {
		let current = true;
		void version;
		setData(null);
		setError("");
		if (path)
			api<T>(path)
				.then((value) => {
					if (current) setData(value);
				})
				.catch((e) => {
					if (current) setError(errorText(e, locale));
				});
		return () => {
			current = false;
		};
	}, [path, locale, version]);
	return { data, error, reload: useCallback(() => setVersion((v) => v + 1), []) };
}
export function ReadState({
	state,
	children,
}: {
	state: { error: string; data: unknown; reload: () => void };
	children: ReactNode;
}) {
	const { locale } = useAdminSession(),
		t = directoryCopy[locale];
	return state.error ? (
		<div role="alert">
			<p>{state.error}</p>
			<button type="button" onClick={state.reload}>
				{t.retry}
			</button>
		</div>
	) : !state.data ? (
		<p role="status">{t.loading}</p>
	) : (
		children
	);
}
export function DirectoryFilter({
	label,
	value,
	change,
	choices,
}: {
	label: string;
	value: string;
	change: (v: string) => void;
	choices?: { value: string; label: string }[];
}) {
	const { locale } = useAdminSession(),
		t = directoryCopy[locale];
	return (
		<div>
			<span>{label}</span>
			<SelectControl
				label={label}
				value={value}
				onChange={change}
				options={[
					{ value: "", label: t.all },
					...(choices ?? [
						{ value: "true", label: t.yes },
						{ value: "false", label: t.no },
					]),
				]}
			/>
		</div>
	);
}
export function CursorControls({
	cursor,
	next,
	change,
}: {
	cursor: string;
	next?: string | null;
	change: (v: string) => void;
}) {
	const { locale } = useAdminSession(),
		t = directoryCopy[locale];
	return (
		<div className={styles.actions}>
			{cursor && (
				<button type="button" className={styles.secondary} onClick={() => change("")}>
					{t.first}
				</button>
			)}
			{next && (
				<button type="button" className={styles.primary} onClick={() => change(next)}>
					{t.next}
				</button>
			)}
		</div>
	);
}
/** Directory reads contain masked identity and metadata, with a real server keyset. */
export function AdminDirectory({ kind }: { kind: "accounts" | "sites" }) {
	const { locale } = useAdminSession(),
		t = directoryCopy[locale];
	const [filters, setFilters] = useState<Record<string, string>>({}),
		[cursor, setCursor] = useState("");
	const query = new URLSearchParams({
		limit: "20",
		...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
	});
	if (cursor) query.set("cursor", cursor);
	const state = useAdminData<CursorPage<AdminUser & AdminSite>>(
		`/api/admin/${kind === "accounts" ? "users" : "sites"}?${query}`,
		locale,
	);
	const change = (key: string, value: string) => {
		setFilters((f) => ({ ...f, [key]: value }));
		setCursor("");
	};
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<h1>{t[kind]}</h1>
			<div className={layout.filters}>
				{kind === "accounts" ? (
					<>
						<label>
							{t.search}
							<input
								type="search"
								value={filters.search ?? ""}
								maxLength={100}
								onChange={(e) => change("search", e.target.value)}
							/>
						</label>
						<DirectoryFilter
							label={t.role}
							value={filters.role ?? ""}
							change={(v) => change("role", v)}
							choices={["user", "owner", "moderator", "support", "analyst"].map((value) => ({
								value,
								label: value,
							}))}
						/>
						{(["banned", "verified"] as const).map((key) => (
							<DirectoryFilter
								key={key}
								label={t[key]}
								value={filters[key] ?? ""}
								change={(v) => change(key, v)}
							/>
						))}
					</>
				) : (
					(["published", "suspended", "reported"] as const).map((key) => (
						<DirectoryFilter
							key={key}
							label={t[key]}
							value={filters[key] ?? ""}
							change={(v) => change(key, v)}
						/>
					))
				)}
			</div>
			<ReadState state={state}>
				<ul className={layout.queue}>
					{state.data?.items.map((row) => (
						<li key={row.id}>
							<Link href={localeHref(locale, `/admin/${kind}/${encodeURIComponent(row.id)}`)}>
								<strong dir="auto">{kind === "accounts" ? row.name : row.slug}</strong>
								{kind === "accounts" ? (
									<>
										<span dir="ltr">{row.email}</span>
										<span>
											{t.role}: {row.role || "user"} · {t.banned}: {row.banned ? t.yes : t.no} ·{" "}
											{t.verified}: {row.emailVerified ? t.yes : t.no}
										</span>
										<span>
											{t.sites}: {row.siteCount}
										</span>
									</>
								) : (
									<span>
										{t.published}: {row.publishedReleaseId ? t.yes : t.no} · {t.suspended}:{" "}
										{row.suspended ? t.yes : t.no}
									</span>
								)}
								<span>
									{t.created}: {date(row.createdAt, locale)}
								</span>
							</Link>
						</li>
					))}
				</ul>
				{state.data?.items.length === 0 && <p>{t.empty}</p>}
			</ReadState>
			<CursorControls cursor={cursor} next={state.data?.nextCursor} change={setCursor} />
		</section>
	);
}
/** Bounded, independently permission-gated related lists retain their own cursor. */
function Related({ type, filter }: { type: "sites" | "reports" | "audit"; filter: string }) {
	const { locale, permissions } = useAdminSession(),
		t = directoryCopy[locale],
		[cursor, setCursor] = useState("");
	const allowed = permissions.includes(
		type === "audit" ? "audit.read" : type === "reports" ? "report.read" : "site.read",
	);
	const state = useAdminData<
		CursorPage<{
			id: string;
			slug?: string;
			action: string;
			status: string;
			createdAt: string;
			reason?: string;
		}> & { hasMore?: boolean }
	>(
		allowed
			? `/api/admin/${type}?limit=20&${filter}${cursor ? (type === "audit" ? `&offset=${cursor}` : `&cursor=${encodeURIComponent(cursor)}`) : ""}`
			: null,
		locale,
	);
	if (!allowed) return <p>{t.unavailable}</p>;
	return (
		<ReadState state={state}>
			<ul className={layout.queue}>
				{state.data?.items
					.filter((r) => type !== "audit" || ["site.suspend", "site.resume"].includes(r.action))
					.map((r) => (
						<li key={r.id}>
							{type === "audit" ? (
								<p>
									{r.action} · {r.status} · {date(r.createdAt, locale)}
									<br />
									{r.reason}
								</p>
							) : (
								<Link href={localeHref(locale, `/admin/${type}/${r.id}`)}>
									{r.slug} {type === "reports" && `· ${r.status}`}
								</Link>
							)}
						</li>
					))}
			</ul>
			{!state.data?.items.length && <p>{t.empty}</p>}
			{type === "audit" ? (
				<AdminPagination
					locale={locale}
					count={state.data?.items.length ?? 0}
					offset={Number(cursor) || 0}
					more={Boolean((state.data as { hasMore?: boolean })?.hasMore)}
					disabled={!state.data}
					change={(v) => setCursor(String(v))}
				/>
			) : (
				<CursorControls cursor={cursor} next={state.data?.nextCursor} change={setCursor} />
			)}
		</ReadState>
	);
}
/** Account actions call only the existing independently secured native/domain pipelines. */
export function AdminAccountDetail({ id }: { id: string }) {
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
				state.reload();
				sessions.reload();
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
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<Link href={localeHref(locale, "/admin/accounts")}>{t.back}</Link>
			<h1>{t.identity}</h1>
			{notice && <p role="status">{notice}</p>}
			{email && <p dir="ltr">{email}</p>}
			<ReadState state={state}>
				{state.data && (
					<section className={styles.card}>
						<h2 dir="auto">{state.data.name}</h2>
						<p dir="ltr">{state.data.email}</p>
						<p>
							<bdi>{id}</bdi>
						</p>
						<p>
							{t.role}: {state.data.role || "user"} · {t.banned}: {state.data.banned ? t.yes : t.no}{" "}
							· {t.verified}: {state.data.emailVerified ? t.yes : t.no}
						</p>
						<p>
							{t.created}: {date(state.data.createdAt, locale)}
						</p>
						{ordinary ? (
							<div className={styles.actions}>
								{controls
									.filter(([, , permission]) => permissions.includes(permission))
									.map(([value, label]) => (
										<button
											key={value}
											type="button"
											className={styles.secondary}
											onClick={() => choose(value)}
										>
											{label}
										</button>
									))}
							</div>
						) : (
							<p>{t.ordinary}</p>
						)}
					</section>
				)}
			</ReadState>
			<h2>{t.sessions}</h2>
			<ReadState state={sessions}>
				<ul className={layout.queue}>
					{sessions.data?.items.map((s) => (
						<li key={s.id}>
							<bdi>{s.id}</bdi>
							<p>
								{t.created}: {date(s.createdAt, locale)} · {t.expires}: {date(s.expiresAt, locale)}
							</p>
							{ordinary && permissions.includes("user.revoke_session") && (
								<button
									type="button"
									onClick={() => choose(`sessions/${encodeURIComponent(s.id)}/revoke`)}
								>
									{t.revoke}
								</button>
							)}
						</li>
					))}
				</ul>
				{sessions.data?.items.length === 0 && <p>{t.empty}</p>}
			</ReadState>
			<h2>{t.sites}</h2>
			<Related type="sites" filter={`ownerId=${encodeURIComponent(id)}`} />
			<h2>{t.reports}</h2>
			<Related type="reports" filter={`ownerId=${encodeURIComponent(id)}`} />
			{action && (
				<AdminDialog
					headingRef={heading}
					title={controls.find(([v]) => v === action)?.[1] ?? t.revoke}
					locale={locale}
					busy={busy}
					onClose={() => choose("")}
				>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void submit();
						}}
					>
						{error && <p role="alert">{error}</p>}
						<label>
							{t.reason}
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
							{t.password}
							<input
								required
								type="password"
								autoComplete="current-password"
								maxLength={1024}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</label>
						{action === "remove" && (
							<>
								<p>{t.removeWarning}</p>
								<label>
									{t.confirm}
									<input
										dir="ltr"
										required
										value={confirmationId}
										onChange={(e) => setConfirmationId(e.target.value)}
									/>
								</label>
							</>
						)}
						<button
							type="submit"
							className={styles.danger}
							disabled={
								busy ||
								reason.trim().length < 10 ||
								!password ||
								(action === "remove" && confirmationId !== id)
							}
						>
							{t.submit}
						</button>
					</form>
				</AdminDialog>
			)}
		</section>
	);
}
/** Site detail selects published metadata only; moderation shares the existing password dialog. */
export function AdminSiteDetail({ id }: { id: string }) {
	const { locale, user, permissions } = useAdminSession(),
		t = directoryCopy[locale];
	const c = useAdminController(locale, "sites", true),
		state = useAdminData<AdminSite>(`/api/admin/sites/${encodeURIComponent(id)}`, locale);
	useEffect(() => {
		if (c.notice) state.reload();
	}, [c.notice, state.reload]);
	return (
		<section className={`${layout.page} ${fields.page}`}>
			<Link href={localeHref(locale, "/admin/sites")}>{t.back}</Link>
			<ReadState state={state}>
				{state.data && (
					<section className={styles.card}>
						<h1 dir="ltr">{state.data.slug}</h1>
						<dl className={styles.detailsList}>
							{[
								["ID", id],
								[t.locale, state.data.locale ?? t.privateLocale],
								[t.published, state.data.publishedReleaseId ? t.yes : t.no],
								[t.suspended, state.data.suspended ? t.yes : t.no],
								[t.created, date(state.data.createdAt, locale)],
								[
									t.publication,
									state.data.publishedAt ? date(state.data.publishedAt, locale) : "—",
								],
								[t.releases, state.data.releaseCount],
								[t.ready, state.data.readyImages],
								[t.pending, state.data.pendingImages],
							].map(([label, value]) => (
								<div key={label}>
									<dt>{label}</dt>
									<dd dir="auto">{value}</dd>
								</div>
							))}
						</dl>
						{state.data.publishedReleaseId && (
							<Link href={`/p/${state.data.slug}`} target="_blank" rel="noreferrer">
								{t.publicLink}
							</Link>
						)}
						{permissions.includes(state.data.suspended ? "site.resume" : "site.suspend") && (
							<button
								type="button"
								className={styles.secondary}
								onClick={() => c.openSiteDetails({ id })}
							>
								{t.open}
							</button>
						)}
					</section>
				)}
			</ReadState>
			{c.error && !c.details && <p role="alert">{c.error}</p>}
			{c.notice && <p role="status">{c.notice}</p>}
			<h2>{t.reports}</h2>
			<Related type="reports" filter={`siteId=${id}`} />
			<h2>{t.history}</h2>
			<Related type="audit" filter={`targetType=site&targetId=${id}`} />
			<AdminManagementDialogs controller={c} locale={locale} currentUserId={user.id} />
		</section>
	);
}
