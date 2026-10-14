"use client";
import { collectAssetIds, type Locale, type Site } from "@folio/contracts";
import { Portfolio } from "@folio/portfolio";
import { useEffect, useRef, useState } from "react";
import { SelectControl } from "../../components/ui/select-control";
import { api } from "../../lib/api";
import { useAssetUrls } from "../assets/use-asset-urls";
import { InquiryForm } from "../portfolio/inquiry-form";
import { text } from "./copy";
import styles from "./management.module.css";
import { date, errorText, Pager, usePage } from "./shared";
import type { Inquiry, Release, Snapshot } from "./types";
export function SiteOperations({
	site,
	locale,
	onPublicationChange,
	onBusyChange,
	disabled = false,
}: {
	site: Site;
	locale: Locale;
	onPublicationChange: (site: Site) => void;
	onBusyChange?: (busy: boolean) => void;
	disabled?: boolean;
}) {
	const t = text[locale];
	const [tab, setTab] = useState<"inquiries" | "releases">("inquiries");
	const [offset, setOffset] = useState(0);
	const [status, setStatus] = useState("");
	const page = usePage<Inquiry | Release>(
		`/api/sites/${site.id}/${tab}?limit=20&offset=${offset}${tab === "inquiries" && status ? `&status=${status}` : ""}`,
		locale,
	);
	const [busy, setBusy] = useState(false);
	const busyCallback = useRef(onBusyChange);
	busyCallback.current = onBusyChange;
	useEffect(() => {
		busyCallback.current?.(busy);
	}, [busy]);
	useEffect(() => () => busyCallback.current?.(false), []);
	const [error, setError] = useState("");
	const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
	const releaseAssetUrls = useAssetUrls(
		snapshot ? site.id : undefined,
		snapshot ? collectAssetIds(snapshot.snapshot) : [],
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: A different owned site must reset local view state.
	useEffect(() => {
		setSnapshot(null);
		setOffset(0);
		setError("");
	}, [site.id]);
	async function act(operation: () => Promise<void>) {
		setBusy(true);
		setError("");
		try {
			await operation();
		} catch (e) {
			setError(errorText(e, locale));
		} finally {
			setBusy(false);
		}
	}
	return (
		<section
			className={styles.panel}
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-busy={busy || page.loading}
		>
			<div className={styles.actions}>
				{(["inquiries", "releases"] as const).map((value) => (
					<button
						type="button"
						key={value}
						aria-pressed={tab === value}
						disabled={busy}
						onClick={() => {
							setTab(value);
							setOffset(0);
							setSnapshot(null);
							setError("");
						}}
					>
						{value === "inquiries" ? t.inbox : t.history}
					</button>
				))}
				<button
					type="button"
					disabled={busy || page.loading}
					onClick={() =>
						act(async () => {
							if (tab === "releases") onPublicationChange(await api<Site>(`/api/sites/${site.id}`));
							page.reload();
						})
					}
				>
					{t.reload}
				</button>
			</div>
			{tab === "inquiries" && (
				<div className="field">
					{t.inbox}
					<SelectControl
						label={t.inbox}
						value={status}
						disabled={busy}
						onChange={(value) => {
							setStatus(value);
							setOffset(0);
						}}
						options={[
							{ value: "", label: t.all },
							...(["new", "read", "archived"] as const).map((value) => ({
								value,
								label: t[value],
							})),
						]}
					/>
				</div>
			)}
			{(error || page.error) && <p role="alert">{error || page.error}</p>}
			{page.loading && <p role="status">{t.loading}</p>}
			{page.data?.items.length === 0 && <p>{t.empty}</p>}
			{page.data?.items.map((row) =>
				"message" in row ? (
					<article className={styles.card} key={row.id}>
						<h3 dir="auto">{row.name}</h3>
						<a href={`mailto:${row.email}`} dir="ltr">
							{row.email}
						</a>
						<p className={styles.message} dir="auto">
							{row.message}
						</p>
						<small>
							{date(row.createdAt, locale)} · {t[row.status]}
						</small>
						<div className={styles.actions}>
							{(["read", "archived"] as const).map((next) => (
								<button
									type="button"
									key={next}
									disabled={busy || row.status === next}
									onClick={() =>
										act(async () => {
											await api(`/api/sites/${site.id}/inquiries/${row.id}`, "PATCH", {
												status: next,
											});
											page.reload();
										})
									}
								>
									{next === "read" ? t.markRead : t.archive}
								</button>
							))}
						</div>
					</article>
				) : (
					<article className={styles.card} key={row.id}>
						<strong>
							{t.revision} {row.revision}
						</strong>
						<p>
							{date(row.createdAt, locale)}
							{row.id === site.publishedReleaseId ? ` · ${t.active}` : ""}
						</p>
						<div className={styles.actions}>
							<button
								type="button"
								disabled={busy}
								onClick={() =>
									act(async () => {
										setSnapshot(await api<Snapshot>(`/api/sites/${site.id}/releases/${row.id}`));
									})
								}
							>
								{t.preview}
							</button>
							<button
								type="button"
								disabled={busy || disabled || row.id === site.publishedReleaseId}
								onClick={() =>
									act(async () => {
										const updated = await api<Site>(
											`/api/sites/${site.id}/releases/${row.id}/activate`,
											"POST",
											{ expectedReleaseId: site.publishedReleaseId },
										);
										onPublicationChange(updated);
										page.reload();
									})
								}
							>
								{t.activate}
							</button>
						</div>
					</article>
				),
			)}
			{tab === "releases" && <p>{t.preserve}</p>}
			{page.data && (
				<Pager
					count={page.data.items.length}
					offset={offset}
					hasMore={page.data.hasMore}
					disabled={busy || page.loading}
					locale={locale}
					change={setOffset}
				/>
			)}
			{snapshot && (
				<div className={styles.preview}>
					<div className={styles.actions}>
						<h3>
							{t.revision} {snapshot.revision}
						</h3>
						<button type="button" onClick={() => setSnapshot(null)}>
							{t.close}
						</button>
					</div>
					<Portfolio
						draft={snapshot.snapshot}
						compact
						assetUrls={releaseAssetUrls}
						contactForm={<InquiryForm slug={site.slug} locale={snapshot.snapshot.locale} preview />}
					/>
				</div>
			)}
		</section>
	);
}
