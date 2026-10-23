import { ButtonContent } from "../../../components/ui/button-content";
import { text } from "../shared/copy";
import styles from "./admin.module.css";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { AdminDialog } from "./admin-dialog";
import type { useSiteModeration } from "./use-site-moderation";

type Controller = ReturnType<typeof useSiteModeration>;

/** Presents the site overview and its password-confirmed moderation for the selected record. */
export function SiteModerationDialog({
	controller: c,
	locale,
}: {
	controller: Controller;
	locale: "en" | "ar";
}) {
	const t = adminCopy[locale];
	const shared = text[locale];
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
							<label>
								{t.operatorPassword}
								<input
									type="password"
									autoComplete="current-password"
									maxLength={1024}
									value={c.password}
									disabled={c.busy}
									onChange={(e) => c.setPassword(e.target.value)}
								/>
							</label>
							<button
								type="button"
								className={c.details.suspended ? styles.primary : styles.danger}
								disabled={
									c.busy ||
									!c.password ||
									c.reason.trim().length < 10 ||
									c.reason.trim().length > 500
								}
								onClick={() => c.details && void c.moderateSite(c.details)}
							>
								<ButtonContent loading={c.busy}>
									{c.details.suspended ? shared.resume : shared.suspend}
								</ButtonContent>
							</button>
						</section>
					)}
				</AdminDialog>
			)}
		</>
	);
}
