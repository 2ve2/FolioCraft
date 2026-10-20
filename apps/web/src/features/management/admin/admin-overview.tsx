import type { Locale } from "@ichnara/contracts";
import {
	ArrowUpRight,
	FileStack,
	FolderOpen,
	Globe2,
	MessageSquare,
	PauseCircle,
	Radio,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { localeHref } from "../../../lib/locale";
import { usePage } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite, Audit, Counts } from "../shared/types";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { AdminActivity, AdminSites } from "./admin-lists";

/** Shows only real database totals, without fabricated trends or availability claims. */
export function AdminStats({
	counts,
	locale,
	loading,
}: {
	counts: Counts | null;
	locale: Locale;
	loading: boolean;
}) {
	const t = adminCopy[locale];
	const shared = text[locale];
	const items = [
		{ key: "users", label: shared.counts.users, icon: UsersRound },
		{ key: "sites", label: shared.counts.sites, icon: Globe2 },
		{ key: "publishedSites", label: t.publishedSites, icon: Radio, note: t.publicationNote },
		{
			key: "suspendedSites",
			label: shared.counts.suspendedSites,
			icon: PauseCircle,
			note: t.suspensionNote,
		},
	] as const;
	return (
		<dl className={styles.stats} aria-label={t.countsSource} aria-busy={loading}>
			{items.map((item) => (
				<div key={item.key} className={styles.stat}>
					<dt>
						{item.label}
						<span className={styles.statIcon}>
							<item.icon size={16} aria-hidden="true" />
						</span>
					</dt>
					<dd>{counts ? new Intl.NumberFormat(locale).format(counts[item.key]) : "—"}</dd>
					{"note" in item && <small>{item.note}</small>}
				</div>
			))}
		</dl>
	);
}

/** Loads recent recorded events only while the overview is mounted. */
export function AdminRecentActivity({ locale }: { locale: Locale }) {
	const t = adminCopy[locale];
	const activity = usePage<Audit>("/api/admin/audit?limit=5&offset=0", locale);
	return (
		<section className={styles.card}>
			<header className={styles.cardHeader}>
				<h2>{t.recentActivity}</h2>
				<Link className={styles.subtleLink} href={localeHref(locale, "/admin/activity")}>
					{t.viewAll}
					<ArrowUpRight size={14} aria-hidden="true" />
				</Link>
			</header>
			{activity.loading ? (
				<p className={styles.skeleton} role="status">
					{text[locale].loading}
				</p>
			) : activity.error ? (
				<p className={styles.error} role="alert">
					{activity.error}
				</p>
			) : (
				<AdminActivity items={activity.data?.items || []} locale={locale} />
			)}
		</section>
	);
}

/** Composes useful overview resources and site shortcuts from existing administrative endpoints. */
export function AdminOverview({
	locale,
	counts,
	sites,
	sitesLoading,
	sitesError,
	busy,
	openSite,
	activityVersion,
}: {
	locale: Locale;
	counts: Counts | null;
	sites: AdminSite[];
	sitesLoading: boolean;
	sitesError: string;
	busy: boolean;
	openSite: (site: AdminSite) => void;
	activityVersion: string;
}) {
	const { permissions } = useAdminSession();
	const t = adminCopy[locale];
	const shared = text[locale];
	return (
		<>
			<div className={styles.overviewGrid}>
				<section className={styles.card}>
					<header className={styles.cardHeader}>
						<h2>{t.recentSites}</h2>
						<Link className={styles.subtleLink} href={localeHref(locale, "/admin/sites")}>
							{t.viewAll}
							<ArrowUpRight size={14} aria-hidden="true" />
						</Link>
					</header>
					{sitesLoading ? (
						<p className={styles.skeleton} role="status">
							{shared.loading}
						</p>
					) : sitesError ? (
						<p className={styles.error} role="alert">
							{sitesError}
						</p>
					) : (
						<AdminSites
							sites={sites.slice(0, 5)}
							locale={locale}
							busy={busy}
							open={openSite}
							compact
						/>
					)}
				</section>
				{permissions.includes("system.read") && (
					<section className={styles.card}>
						<header className={styles.cardHeader}>
							<div>
								<h2>{t.resources}</h2>
								<p>{t.resourcesDescription}</p>
							</div>
						</header>
						<dl className={styles.resourceList}>
							{(
								[
									{ key: "releases", icon: FileStack },
									{ key: "assets", icon: FolderOpen },
									{ key: "inquiries", icon: MessageSquare },
								] as const
							).map(({ key, icon: Icon }) => (
								<div key={key}>
									<Icon size={18} color="#9b85b5" aria-hidden="true" />
									<dt>{shared.counts[key]}</dt>
									<dd>{counts ? new Intl.NumberFormat(locale).format(counts[key]) : "—"}</dd>
								</div>
							))}
						</dl>
					</section>
				)}
			</div>
			{permissions.includes("audit.read") && (
				<AdminRecentActivity key={activityVersion} locale={locale} />
			)}
		</>
	);
}
