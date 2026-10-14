"use client";
import type { Locale } from "@folio/contracts";
import { useEffect, useRef, useState } from "react";
import { SelectControl } from "../../components/ui/select-control";
import { api, authClient } from "../../lib/api";
import { text } from "./copy";
import styles from "./management.module.css";
import { date, errorText, nativeError, Pager, usePage } from "./shared";
import type { AdminSite, AdminUser, Audit, Counts } from "./types";
export function AdminPanel({
	locale,
	standalone = false,
}: {
	locale: Locale;
	standalone?: boolean;
}) {
	const t = text[locale];
	const Heading = standalone ? "h1" : "h2";
	const CardHeading = standalone ? "h2" : "h3";
	const [tab, setTab] = useState<"sites" | "audit" | "users">("sites");
	const [offset, setOffset] = useState(0);
	const page = usePage<AdminSite | Audit>(
		`/api/admin/${tab === "users" ? "sites" : tab}?limit=20&offset=${offset}`,
		locale,
	);
	const [counts, setCounts] = useState<Counts | null>(null);
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [userMore, setUserMore] = useState(false);
	const [usersLoaded, setUsersLoaded] = useState(false);
	const [usersError, setUsersError] = useState("");
	const [userLoading, setUserLoading] = useState(false);
	const [userVersion, setUserVersion] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [reason, setReason] = useState("");
	const [selected, setSelected] = useState<AdminUser | null>(null);
	const [confirmation, setConfirmation] = useState("");
	const [role, setRole] = useState<"user" | "admin">("user");
	const [details, setDetails] = useState<AdminSite | null>(null);
	const selectedHeading = useRef<HTMLHeadingElement>(null);
	const detailsHeading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		if (selected) selectedHeading.current?.focus();
	}, [selected]);
	useEffect(() => {
		if (details) detailsHeading.current?.focus();
	}, [details]);
	const mounted = useRef(true);
	const actionPending = useRef(false);
	const viewVersion = useRef(0);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			viewVersion.current += 1;
		};
	}, []);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Refresh resource counts after a completed operation.
	useEffect(() => {
		let current = true;
		api<Counts>("/api/admin/resources")
			.then((value) => {
				if (current) setCounts(value);
			})
			.catch((e) => {
				if (current) setError(errorText(e, locale));
			});
		return () => {
			current = false;
		};
	}, [locale, userVersion]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh invalidates the official identity list.
	useEffect(() => {
		if (tab !== "users") return;
		let current = true;
		setUserLoading(true);
		setUsers([]);
		setUserMore(false);
		setUsersLoaded(false);
		setUsersError("");
		authClient.admin
			.listUsers({ query: { limit: 20, offset, sortBy: "createdAt", sortDirection: "desc" } })
			.then((result) => {
				if (!current) return;
				if (result.error) throw nativeError(result.error);
				setUsers(result.data.users);
				setUsersLoaded(true);
				setUserMore(offset + result.data.users.length < result.data.total);
			})
			.catch((e) => {
				if (current) {
					setUserMore(false);
					setUsersError(errorText(e, locale));
				}
			})
			.finally(() => {
				if (current) setUserLoading(false);
			});
		return () => {
			current = false;
		};
	}, [tab, offset, userVersion, locale]);
	async function act(operation: (isCurrent: () => boolean) => Promise<void>) {
		if (actionPending.current) return;
		actionPending.current = true;
		const version = viewVersion.current;
		const current = () => mounted.current && viewVersion.current === version;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await operation(current);
			if (!current()) return;
			setNotice(t.saved);
			page.reload();
			setUserVersion((v) => v + 1);
		} catch (e) {
			if (current()) setError(errorText(e, locale));
		} finally {
			actionPending.current = false;
			if (mounted.current) setBusy(false);
		}
	}
	async function native(action: "ban" | "unban" | "revoke" | "role") {
		if (!selected || confirmation !== selected.id) return;
		if (action === "ban" && (reason.trim().length < 3 || reason.trim().length > 500)) {
			setError(t.reasonInvalid);
			return;
		}
		const userId = selected.id;
		const version = viewVersion.current;
		await act(async () => {
			const result =
				action === "ban"
					? await authClient.admin.banUser({ userId, banReason: reason.trim() })
					: action === "unban"
						? await authClient.admin.unbanUser({ userId })
						: action === "revoke"
							? await authClient.admin.revokeUserSessions({ userId })
							: await authClient.admin.setRole({ userId, role });
			if (result.error) throw nativeError(result.error);
			if (!mounted.current || viewVersion.current !== version) return;
			setSelected(null);
			setConfirmation("");
			setReason("");
		});
	}
	return (
		<section
			className={styles.panel}
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-busy={busy || (tab === "users" ? userLoading : page.loading)}
		>
			<Heading>{t.admin}</Heading>
			{counts && (
				<dl className={styles.counts}>
					{(Object.keys(t.counts) as (keyof Counts)[]).map((key) => (
						<div key={key}>
							<dt>{t.counts[key]}</dt>
							<dd>{counts[key]}</dd>
						</div>
					))}
				</dl>
			)}
			<div className={styles.actions}>
				{(["sites", "audit", "users"] as const).map((value) => (
					<button
						type="button"
						key={value}
						disabled={busy}
						aria-pressed={tab === value}
						onClick={() => {
							viewVersion.current += 1;
							setTab(value);
							setOffset(0);
							setSelected(null);
							setDetails(null);
							setReason("");
							setError("");
							setNotice("");
						}}
					>
						{t[value]}
					</button>
				))}
				<button
					type="button"
					disabled={busy || page.loading || userLoading}
					onClick={() => {
						page.reload();
						setUserVersion((v) => v + 1);
					}}
				>
					{t.reload}
				</button>
			</div>
			{(error || (tab === "users" ? usersError : page.error)) && (
				<p role="alert">{error || (tab === "users" ? usersError : page.error)}</p>
			)}
			{notice && <p role="status">{notice}</p>}
			{(tab === "users" ? userLoading : page.loading) && <p role="status">{t.loading}</p>}
			{tab === "sites" && (
				<label>
					{t.reason}
					<textarea
						maxLength={500}
						minLength={3}
						value={reason}
						disabled={busy}
						onChange={(e) => setReason(e.target.value)}
					/>
				</label>
			)}
			{tab !== "users" &&
				page.data?.items.map((row) =>
					"slug" in row ? (
						<article key={row.id} className={styles.card}>
							<CardHeading dir="ltr">{row.slug}</CardHeading>
							<p>
								{row.suspended ? t.suspended : t.enabled} · {t.revision} {row.revision}
							</p>
							{row.suspensionReason && <p dir="auto">{row.suspensionReason}</p>}
							<div className={styles.actions}>
								<button
									type="button"
									disabled={busy}
									onClick={() => {
										if (actionPending.current) return;
										actionPending.current = true;
										const version = ++viewVersion.current;
										const current = () => mounted.current && viewVersion.current === version;
										setBusy(true);
										setError("");
										api<AdminSite>(`/api/admin/sites/${row.id}`)
											.then((value) => {
												if (current()) setDetails(value);
											})
											.catch((e) => {
												if (current()) setError(errorText(e, locale));
											})
											.finally(() => {
												actionPending.current = false;
												if (mounted.current) setBusy(false);
											});
									}}
								>
									{t.details}
								</button>
								<button
									type="button"
									disabled={busy || reason.trim().length < 3}
									onClick={() =>
										act(async (isCurrent) => {
											await api(
												`/api/admin/sites/${row.id}/${row.suspended ? "resume" : "suspend"}`,
												"POST",
												{ reason: reason.trim() },
											);
											if (!isCurrent()) return;
											setReason("");
											setDetails(null);
										})
									}
								>
									{row.suspended ? t.resume : t.suspend}
								</button>
							</div>
						</article>
					) : (
						<article key={row.id} className={styles.card}>
							<strong dir="ltr">{row.action}</strong>
							<p>
								{date(row.createdAt, locale)} ·{" "}
								{row.status === "failed" ? t.failedStatus : t[row.status]}
							</p>
							<p dir="ltr">
								{row.actorId} → {row.targetType}: {row.targetId}
							</p>
							{row.reason && <p dir="auto">{row.reason}</p>}
						</article>
					),
				)}
			{details && (
				<article className={styles.card}>
					<CardHeading dir="ltr" tabIndex={-1} ref={detailsHeading}>
						{details.slug}
					</CardHeading>
					<p>
						{t.counts.releases}: {details.releaseCount} · {t.counts.assets}: {details.assetCount} ·{" "}
						{t.counts.inquiries}: {details.inquiryCount}
					</p>
					<button
						type="button"
						onClick={() => {
							viewVersion.current += 1;
							setDetails(null);
						}}
					>
						{t.close}
					</button>
				</article>
			)}
			{tab === "users" &&
				users.map((user) => (
					<article key={user.id} className={styles.card}>
						<CardHeading dir="auto">{user.name}</CardHeading>
						<p dir="ltr">{user.email}</p>
						<p dir="ltr">{user.id}</p>
						<p>
							{user.role === "admin" ? t.administrator : t.user} · {user.banned ? t.ban : t.enabled}
						</p>
						<button
							type="button"
							disabled={busy}
							onClick={() => {
								viewVersion.current += 1;
								setSelected(user);
								setConfirmation("");
								setReason("");
								setRole(user.role === "admin" ? "admin" : "user");
							}}
						>
							{t.manageUser}
						</button>
					</article>
				))}
			{tab === "users" && selected && (
				<article className={styles.card}>
					<div className={styles.actions}>
						<CardHeading dir="auto" tabIndex={-1} ref={selectedHeading}>
							{selected.name}
						</CardHeading>
						<button
							type="button"
							disabled={busy}
							onClick={() => {
								viewVersion.current += 1;
								setSelected(null);
								setConfirmation("");
								setReason("");
							}}
						>
							{t.close}
						</button>
					</div>
					<p dir="ltr">{selected.id}</p>
					<label>
						{t.confirm}
						<input
							dir="ltr"
							value={confirmation}
							disabled={busy}
							onChange={(e) => setConfirmation(e.target.value)}
						/>
					</label>
					<label>
						{t.reason}
						<textarea
							value={reason}
							disabled={busy}
							maxLength={500}
							onChange={(e) => setReason(e.target.value)}
						/>
					</label>
					<div className="field">
						{t.role}
						<SelectControl
							label={t.role}
							value={role}
							disabled={busy}
							onChange={(value) => setRole(value as "admin" | "user")}
							options={[
								{ value: "user", label: t.user },
								{ value: "admin", label: t.administrator },
							]}
						/>
					</div>
					<div className={styles.actions}>
						{([selected.banned ? "unban" : "ban", "revoke", "role"] as const).map((action) => (
							<button
								type="button"
								key={action}
								disabled={
									busy ||
									confirmation !== selected.id ||
									(action === "ban" && reason.trim().length < 3)
								}
								onClick={() => native(action)}
							>
								{action === "role" ? t.setRole : t[action]}
							</button>
						))}
					</div>
				</article>
			)}
			{(tab === "users"
				? usersLoaded && !userLoading && users.length === 0
				: page.data?.items.length === 0) && <p>{t.empty}</p>}
			<Pager
				count={tab === "users" ? users.length : page.data?.items.length || 0}
				offset={offset}
				hasMore={tab === "users" ? userMore : Boolean(page.data?.hasMore)}
				disabled={busy || (tab === "users" ? userLoading : page.loading)}
				locale={locale}
				change={(next) => {
					viewVersion.current += 1;
					setSelected(null);
					setDetails(null);
					setOffset(next);
				}}
			/>
		</section>
	);
}
