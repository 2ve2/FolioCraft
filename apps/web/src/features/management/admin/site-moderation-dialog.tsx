import { ButtonContent } from "../../../components/ui/button-content";
import { text } from "../shared/copy";
import { useAdminSession } from "./admin-context";
import { adminCopy } from "./admin-copy";
import { AdminDialog } from "./admin-dialog";
import { KeyValues, StatusBadge, ui } from "./ui/console";
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
		c.details && (
			<AdminDialog
				title={c.details.slug}
				locale={locale}
				onClose={c.closeSiteDetails}
				busy={c.busy}
				headingRef={c.detailsHeading}
			>
				<div className={ui.form}>
					{c.error && (
						<p className={ui.banner} data-tone="danger" role="alert">
							{c.error}
						</p>
					)}
					<div className={ui.titleRow}>
						<h3 className={ui.panelTitle}>{t.siteDetails}</h3>
						<StatusBadge tone={c.details.suspended ? "danger" : "success"}>
							{c.details.suspended ? t.suspended : t.active}
						</StatusBadge>
					</div>
					<KeyValues
						items={[
							{ label: shared.counts.releases, value: c.details.releaseCount ?? "—" },
							{ label: shared.counts.assets, value: c.details.assetCount ?? "—" },
							{ label: shared.counts.inquiries, value: c.details.inquiryCount ?? "—" },
							{ label: t.siteId, value: c.details.id, mono: true },
							{ label: t.owner, value: c.details.ownerId, mono: true },
							{
								label: t.publishedRelease,
								value: c.details.publishedReleaseId,
								mono: true,
								hidden: !c.details.publishedReleaseId,
							},
						]}
					/>
					{canModerate && (
						<section className={ui.form}>
							<div>
								<h3 className={ui.panelTitle}>{t.moderation}</h3>
								<p className={ui.description}>{t.moderationDescription}</p>
							</div>
							{c.details.suspensionReason && (
								<p className={ui.previewBox} dir="auto">
									{c.details.suspensionReason}
								</p>
							)}
							<label className={ui.field}>
								{shared.reason}
								<textarea
									className={ui.input}
									minLength={10}
									maxLength={500}
									value={c.reason}
									disabled={c.busy}
									onChange={(e) => c.setReason(e.target.value)}
								/>
							</label>
							<label className={ui.field}>
								{t.operatorPassword}
								<input
									className={ui.input}
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
								className={c.details.suspended ? ui.buttonPrimary : ui.buttonDanger}
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
				</div>
			</AdminDialog>
		)
	);
}
