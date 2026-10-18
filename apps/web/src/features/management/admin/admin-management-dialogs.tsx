import { text } from "../shared/copy";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { AdminDialog } from "./admin-dialog";
import type { useAdminController } from "./use-admin-controller";

type Controller = ReturnType<typeof useAdminController>;

/** Presents moderation and native identity confirmations only for the selected server record. */
export function AdminManagementDialogs({
	controller: c,
	locale,
	currentUserId,
}: {
	controller: Controller;
	locale: "en" | "ar";
	currentUserId: string;
}) {
	const t = adminCopy[locale];
	const shared = text[locale];
	const self = c.selected?.id === currentUserId;
	const { permissions } = useAdminSession();
	const canModerate = permissions.includes(c.details?.suspended ? "site.resume" : "site.suspend");
	return (
		<>
			{c.details && (
				<AdminDialog
					title={c.details.slug}
					locale={locale}
					onClose={c.closeSiteDetails}
					busy={c.busy}
					headingRef={c.detailsHeading}
				>
					{c.error && (
						<p className={styles.error} role="alert">
							{c.error}
						</p>
					)}
					<section>
						<h3>{t.siteDetails}</h3>
						<span
							className={`${styles.badge} ${c.details.suspended ? styles.warning : styles.good}`}
						>
							{c.details.suspended ? t.suspended : t.active}
						</span>
						<dl className={styles.dialogStats}>
							{(
								[
									["releases", c.details.releaseCount],
									["assets", c.details.assetCount],
									["inquiries", c.details.inquiryCount],
								] as const
							).map(([key, value]) => (
								<div key={key}>
									<dt>{shared.counts[key]}</dt>
									<dd>{value ?? "—"}</dd>
								</div>
							))}
						</dl>
						<dl className={styles.detailsList}>
							<div>
								<dt>{t.siteId}</dt>
								<dd dir="ltr">{c.details.id}</dd>
							</div>
							<div>
								<dt>{t.owner}</dt>
								<dd dir="ltr">{c.details.ownerId}</dd>
							</div>
							{c.details.publishedReleaseId && (
								<div>
									<dt>{t.publishedRelease}</dt>
									<dd dir="ltr">{c.details.publishedReleaseId}</dd>
								</div>
							)}
						</dl>
					</section>
					{canModerate && (
						<section>
							<h3>{t.moderation}</h3>
							<p>{t.moderationDescription}</p>
							{c.details.suspensionReason && <p dir="auto">{c.details.suspensionReason}</p>}
							<label>
								{shared.reason}
								<textarea
									minLength={10}
									maxLength={500}
									value={c.reason}
									disabled={c.busy}
									onChange={(e) => c.setReason(e.target.value)}
								/>
							</label>
							<button
								type="button"
								className={c.details.suspended ? styles.primary : styles.danger}
								disabled={c.busy || c.reason.trim().length < 10}
								onClick={() => c.details && void c.moderateSite(c.details)}
							>
								{c.details.suspended ? shared.resume : shared.suspend}
							</button>
						</section>
					)}
				</AdminDialog>
			)}
			{c.selected && (
				<AdminDialog
					title={c.selected.name}
					locale={locale}
					onClose={c.closeUser}
					busy={c.busy}
					headingRef={c.selectedHeading}
				>
					{c.error && (
						<p className={styles.error} role="alert">
							{c.error}
						</p>
					)}
					<section>
						<h3>{t.accountDetails}</h3>
						<p dir="ltr">{c.selected.email}</p>
						<span className={`${styles.badge} ${c.selected.banned ? styles.bad : styles.good}`}>
							{c.selected.banned ? t.banned : t.active}
						</span>
					</section>
					{self && <p className={styles.loading}>{t.selfAccount}</p>}
					<p className={styles.caption}>{t.securityPending}</p>
				</AdminDialog>
			)}
		</>
	);
}
