"use client";
import type { Locale } from "@folio/contracts";
import { SelectControl } from "../../../components/ui/select-control";
import { date, Pager } from "../shared";
import { text } from "../shared/copy";
import styles from "../shared/management.module.css";
import type { Counts } from "../shared/types";
import { useAdminController } from "./use-admin-controller";

/** Renders administration tabs while the controller owns request and mutation state. */
export function AdminPanel({
	locale,
	standalone = false,
}: {
	locale: Locale;
	standalone?: boolean;
}) {
	const {
		tab,
		offset,
		page,
		counts,
		users,
		userMore,
		usersLoaded,
		usersError,
		userLoading,
		busy,
		error,
		notice,
		reason,
		setReason,
		selected,
		confirmation,
		setConfirmation,
		role,
		setRole,
		details,
		selectedHeading,
		detailsHeading,
		native,
		changeTab,
		refresh,
		openSiteDetails,
		moderateSite,
		openUser,
		closeUser,
		closeSiteDetails,
		changePage,
	} = useAdminController(locale);
	const t = text[locale];
	const Heading = standalone ? "h1" : "h2";
	const CardHeading = standalone ? "h2" : "h3";
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
						onClick={() => changeTab(value)}
					>
						{t[value]}
					</button>
				))}
				<button type="button" disabled={busy || page.loading || userLoading} onClick={refresh}>
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
								<button type="button" disabled={busy} onClick={() => openSiteDetails(row)}>
									{t.details}
								</button>
								<button
									type="button"
									disabled={busy || reason.trim().length < 3}
									onClick={() => moderateSite(row)}
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
					<button type="button" onClick={closeSiteDetails}>
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
						<button type="button" disabled={busy} onClick={() => openUser(user)}>
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
						<button type="button" disabled={busy} onClick={closeUser}>
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
				change={changePage}
			/>
		</section>
	);
}
