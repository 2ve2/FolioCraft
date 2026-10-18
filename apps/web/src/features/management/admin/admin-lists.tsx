import type { Locale } from "@ichnara/contracts";
import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Globe2,
	Inbox,
	ScrollText,
	UserRound,
} from "lucide-react";
import { date } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite, AdminUser, Audit } from "../shared/types";
import styles from "./admin.module.css";
import { adminCopy, auditActions } from "./admin-copy";

/** Keeps empty resource pages explicit rather than fabricating administrative records. */
export function AdminEmpty({ title, locale }: { title: string; locale: Locale }) {
	return (
		<div className={styles.empty}>
			<Inbox size={30} aria-hidden="true" />
			<h3>{title}</h3>
			<p>{adminCopy[locale].emptyDescription}</p>
		</div>
	);
}

/** Lists administrative site metadata with per-site access to focused management. */
export function AdminSites({
	sites,
	locale,
	busy,
	open,
	compact = false,
}: {
	sites: AdminSite[];
	locale: Locale;
	busy: boolean;
	open: (site: AdminSite) => void;
	compact?: boolean;
}) {
	const t = adminCopy[locale];
	if (!sites.length) return <AdminEmpty title={t.noSites} locale={locale} />;
	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th scope="col">{t.portfolio}</th>
					<th scope="col">{t.access}</th>
					{!compact && (
						<>
							<th scope="col">{t.publication}</th>
							<th scope="col">{t.revision}</th>
						</>
					)}
					<th scope="col">{t.actions}</th>
				</tr>
			</thead>
			<tbody>
				{sites.map((site) => (
					<tr key={site.id}>
						<td>
							<div className={styles.identity}>
								<span className={styles.rowIcon}>
									<Globe2 size={17} aria-hidden="true" />
								</span>
								<div>
									<strong dir="ltr">{site.slug}</strong>
									<small dir="ltr">/p/{site.slug}</small>
								</div>
							</div>
						</td>
						<td data-label={t.access}>
							<span className={`${styles.badge} ${site.suspended ? styles.warning : styles.good}`}>
								{site.suspended ? t.suspended : t.active}
							</span>
						</td>
						{!compact && (
							<>
								<td data-label={t.publication}>
									<span className={styles.caption}>
										{site.publishedReleaseId ? t.published : t.draftOnly}
									</span>
								</td>
								<td data-label={t.revision}>{site.revision}</td>
							</>
						)}
						<td>
							<button
								type="button"
								className={styles.rowAction}
								disabled={busy}
								onClick={() => open(site)}
								aria-label={`${t.manageSite}: ${site.slug}`}
							>
								{t.manage}
								<ArrowUpRight size={14} aria-hidden="true" />
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/** Keeps identity and account access readable without exposing raw identifiers in every row. */
export function AdminAccounts({
	users,
	locale,
	busy,
	open,
}: {
	users: AdminUser[];
	locale: Locale;
	busy: boolean;
	open: (user: AdminUser) => void;
}) {
	const t = adminCopy[locale];
	const shared = text[locale];
	if (!users.length) return <AdminEmpty title={t.noUsers} locale={locale} />;
	return (
		<table className={styles.table}>
			<thead>
				<tr>
					<th scope="col">{t.account}</th>
					<th scope="col">{shared.role}</th>
					<th scope="col">{t.access}</th>
					<th scope="col">{t.actions}</th>
				</tr>
			</thead>
			<tbody>
				{users.map((user) => (
					<tr key={user.id}>
						<td>
							<div className={styles.identity}>
								<span className={styles.rowIcon}>
									<UserRound size={17} aria-hidden="true" />
								</span>
								<div>
									<strong dir="auto">{user.name}</strong>
									<small dir="ltr">{user.email}</small>
								</div>
							</div>
						</td>
						<td data-label={shared.role}>
							<span className={styles.caption}>{user.role || shared.user}</span>
						</td>
						<td data-label={t.access}>
							<span className={`${styles.badge} ${user.banned ? styles.bad : styles.good}`}>
								{user.banned ? t.banned : t.active}
							</span>
						</td>
						<td>
							<button
								type="button"
								className={styles.rowAction}
								disabled={busy}
								onClick={() => open(user)}
								aria-label={`${shared.manageUser}: ${user.name}`}
							>
								{t.manage}
								<ArrowUpRight size={14} aria-hidden="true" />
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/** Renders real audit outcomes, with raw action fallback for unrecognized native events. */
export function AdminActivity({ items, locale }: { items: Audit[]; locale: Locale }) {
	const t = adminCopy[locale];
	const shared = text[locale];
	if (!items.length) return <AdminEmpty title={t.noAudit} locale={locale} />;
	return (
		<ol className={styles.activity}>
			{items.map((item) => (
				<li key={item.id}>
					<span className={styles.rowIcon}>
						<ScrollText size={17} aria-hidden="true" />
					</span>
					<div className={styles.activityBody}>
						<header>
							<strong dir="auto">
								{item.action === "site.suspend"
									? t.siteSuspended
									: item.action === "site.resume"
										? t.siteResumed
										: auditActions[item.action]?.[locale] || item.action}
							</strong>
							<span
								className={`${styles.badge} ${item.status === "succeeded" ? styles.good : item.status === "failed" ? styles.bad : styles.warning}`}
							>
								{item.status === "failed" ? shared.failedStatus : shared[item.status]}
							</span>
							<time dateTime={item.createdAt}>{date(item.createdAt, locale)}</time>
						</header>
						{item.reason && <p dir="auto">{item.reason}</p>}
						<div className={styles.auditMeta}>
							<span>
								{t.actor}: <bdi>{item.actorId}</bdi>
							</span>
							<span>
								{t.target}:{" "}
								<bdi>
									{item.targetType} · {item.targetId}
								</bdi>
							</span>
						</div>
					</div>
				</li>
			))}
		</ol>
	);
}

/** Preserves the existing bounded twenty-record pagination with clear navigation controls. */
export function AdminPagination({
	locale,
	count,
	offset,
	more,
	disabled,
	change,
}: {
	locale: Locale;
	count: number;
	offset: number;
	more: boolean;
	disabled: boolean;
	change: (offset: number) => void;
}) {
	const t = text[locale];
	return (
		<footer className={styles.pagination}>
			<span>
				{count ? `${offset + 1}–${offset + count}` : "0"}
				{more && offset >= 10000 && ` · ${t.bounded}`}
			</span>
			<div>
				<button
					className={styles.rowAction}
					type="button"
					disabled={disabled || offset === 0}
					onClick={() => change(Math.max(0, offset - 20))}
				>
					{locale === "ar" ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
					{t.previous}
				</button>
				<button
					className={styles.rowAction}
					type="button"
					disabled={disabled || !more || offset >= 10000}
					onClick={() => change(offset + 20)}
				>
					{t.next}
					{locale === "ar" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
				</button>
			</div>
		</footer>
	);
}
