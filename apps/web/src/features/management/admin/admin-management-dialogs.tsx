import { SelectControl } from "../../../components/ui/select-control";
import { text } from "../shared/copy";
import styles from "./admin.module.css";
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
					<section>
						<h3>{t.moderation}</h3>
						<p>{t.moderationDescription}</p>
						{c.details.suspensionReason && <p dir="auto">{c.details.suspensionReason}</p>}
						<label>
							{shared.reason}
							<textarea
								minLength={3}
								maxLength={500}
								value={c.reason}
								disabled={c.busy}
								onChange={(e) => c.setReason(e.target.value)}
							/>
						</label>
						<button
							type="button"
							className={c.details.suspended ? styles.primary : styles.danger}
							disabled={c.busy || c.reason.trim().length < 3}
							onClick={() => c.details && void c.moderateSite(c.details)}
						>
							{c.details.suspended ? shared.resume : shared.suspend}
						</button>
					</section>
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
					<section>
						<h3>{t.confirmation}</h3>
						<p>{t.confirmationDescription}</p>
						<dl className={styles.detailsList}>
							<div>
								<dt>{t.identity}</dt>
								<dd dir="ltr">{c.selected.id}</dd>
							</div>
						</dl>
						<label>
							{shared.confirm}
							<input
								dir="ltr"
								autoComplete="off"
								value={c.confirmation}
								disabled={c.busy || self}
								onChange={(e) => c.setConfirmation(e.target.value)}
							/>
						</label>
					</section>
					<section>
						<h3>{t.accountAccess}</h3>
						<p>{t.accountAccessDescription}</p>
						<label>
							{shared.reason}
							<textarea
								value={c.reason}
								disabled={c.busy || self}
								maxLength={500}
								onChange={(e) => c.setReason(e.target.value)}
							/>
						</label>
						<button
							type="button"
							className={c.selected.banned ? styles.primary : styles.danger}
							disabled={
								c.busy ||
								self ||
								c.confirmation !== c.selected.id ||
								(!c.selected.banned && c.reason.trim().length < 3)
							}
							onClick={() => void c.native(c.selected?.banned ? "unban" : "ban")}
						>
							{c.selected.banned ? shared.unban : shared.ban}
						</button>
					</section>
					<section>
						<h3>{t.permissions}</h3>
						<p>{t.permissionsDescription}</p>
						<div className="field">
							<span>{shared.role}</span>
							<SelectControl
								label={shared.role}
								value={c.role}
								disabled={c.busy || self}
								onChange={(value) => c.setRole(value as "admin" | "user")}
								options={[
									{ value: "user", label: shared.user },
									{ value: "admin", label: shared.administrator },
								]}
							/>
						</div>
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.secondary}
								disabled={c.busy || self || c.confirmation !== c.selected.id}
								onClick={() => void c.native("role")}
							>
								{shared.setRole}
							</button>
							<button
								type="button"
								className={styles.secondary}
								disabled={c.busy || self || c.confirmation !== c.selected.id}
								onClick={() => void c.native("revoke")}
							>
								{shared.revoke}
							</button>
						</div>
					</section>
				</AdminDialog>
			)}
		</>
	);
}
