"use client";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TooltipButton } from "../../../components/ui/tooltip-button";
import { text } from "../shared/copy";
import type { AdminSite, Audit } from "../shared/types";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { type AdminView, adminCopy } from "./admin-copy";
import { AdminAccounts, AdminActivity, AdminPagination, AdminSites } from "./admin-lists";
import { AdminManagementDialogs } from "./admin-management-dialogs";
import { AdminOverview, AdminStats } from "./admin-overview";
import { useAdminController } from "./use-admin-controller";

/** Composes the selected route's administrative view while preserving existing request guards. */
export function AdminPanel({ view }: { view: AdminView }) {
	const { locale, user, permissions } = useAdminSession();
	const c = useAdminController(locale, view === "overview" ? "sites" : view);
	const [refreshVersion, setRefreshVersion] = useState(0);
	const feedback = useRef<HTMLParagraphElement>(null);

	// Announce completed actions after refreshed rows replace the original dialog opener.
	useEffect(() => {
		if (c.notice && !c.page.loading && !c.userLoading) feedback.current?.focus();
	}, [c.notice, c.page.loading, c.userLoading]);
	const t = adminCopy[locale];
	const shared = text[locale];
	const loading = view === "users" ? c.userLoading : c.page.loading;
	const sites = (c.page.data?.items || []).filter((row): row is AdminSite => "slug" in row);
	const events = (c.page.data?.items || []).filter((row): row is Audit => "action" in row);
	const pageError = view === "users" ? c.usersError : c.page.error;
	const description =
		view === "overview"
			? t.overviewDescription
			: view === "sites"
				? t.sitesDescription
				: view === "users"
					? t.usersDescription
					: t.auditDescription;

	/** Refreshes the current view, totals and the overview activity without changing route state. */
	function refresh() {
		c.refresh();
		setRefreshVersion((value) => value + 1);
	}

	return (
		<section aria-busy={c.busy || loading}>
			<header className={styles.pageHeader}>
				<div>
					<h1>{view === "overview" ? t.intro : t[view]}</h1>
					<p>{description}</p>
				</div>
				<div className={styles.refreshArea}>
					{c.updatedAt && (
						<small>
							{t.updated}{" "}
							{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
								c.updatedAt,
							)}
						</small>
					)}
					<TooltipButton
						type="button"
						className={styles.iconButton}
						aria-label={t.refresh}
						hint={t.refresh}
						disabled={c.busy || loading || c.countsLoading}
						onClick={refresh}
					>
						<RefreshCw size={17} className={loading || c.countsLoading ? "spin" : undefined} />
					</TooltipButton>
				</div>
			</header>
			{c.error && !c.details && !c.selected && (
				<p className={styles.error} role="alert">
					{c.error}
				</p>
			)}
			{c.notice && (
				<p className={styles.notice} role="status" ref={feedback} tabIndex={-1}>
					{c.notice}
				</p>
			)}
			{view === "overview" ? (
				<>
					{c.countsError && (
						<p className={styles.error} role="alert">
							{c.countsError}
						</p>
					)}
					{permissions.includes("system.read") && (
						<AdminStats counts={c.counts} locale={locale} loading={c.countsLoading} />
					)}
					<AdminOverview
						locale={locale}
						counts={c.counts}
						sites={sites}
						sitesLoading={loading}
						sitesError={pageError}
						busy={c.busy}
						openSite={c.openSiteDetails}
						activityVersion={`${refreshVersion}:${c.notice}`}
					/>
				</>
			) : (
				<>
					{view === "sites" && (
						<div className={styles.toolbar}>
							<fieldset className={styles.filters} aria-label={t.siteFilter}>
								{(
									[
										["all", t.allSites],
										["accessible", t.accessibleSites],
										["suspended", t.suspendedSites],
									] as const
								).map(([value, label]) => (
									<button
										key={value}
										type="button"
										aria-pressed={c.siteFilter === value}
										disabled={c.busy || loading}
										onClick={() => c.changeSiteFilter(value)}
									>
										{label}
									</button>
								))}
							</fieldset>
						</div>
					)}
					{view === "audit" && <p className={styles.caption}>{t.auditHelp}</p>}
					<section className={styles.card} aria-label={t[view]}>
						{loading ? (
							<p role="status" className={styles.skeleton}>
								{shared.loading}
							</p>
						) : pageError ? (
							<p className={styles.error} role="alert">
								{pageError}
							</p>
						) : view === "users" ? (
							<AdminAccounts users={c.users} locale={locale} busy={c.busy} open={c.openUser} />
						) : view === "sites" ? (
							<AdminSites sites={sites} locale={locale} busy={c.busy} open={c.openSiteDetails} />
						) : (
							<AdminActivity items={events} locale={locale} />
						)}
						<AdminPagination
							locale={locale}
							count={view === "users" ? c.users.length : c.page.data?.items.length || 0}
							offset={c.offset}
							more={view === "users" ? c.userMore : Boolean(c.page.data?.hasMore)}
							disabled={c.busy || loading}
							change={c.changePage}
						/>
					</section>
				</>
			)}
			<AdminManagementDialogs controller={c} locale={locale} currentUserId={user.id} />
		</section>
	);
}
