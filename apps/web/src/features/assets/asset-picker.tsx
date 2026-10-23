"use client";

import type { Locale } from "@ichnara/contracts";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ButtonContent } from "../../components/ui/button-content";
import { ApiError, api, authClient } from "../../lib/api";
import styles from "./asset-picker.module.css";
import { AssetPreview } from "./asset-preview";
import { copy } from "./copy";
import type { Asset, UploadIntent } from "./types";
import { useAssetUrlState } from "./use-asset-urls";

/** Manages owned image uploads, verified attachments and explicit protected file deletion. */
export function AssetPicker({
	siteId,
	locale,
	value,
	onChange,
	label,
	protectedIds = [],
}: {
	siteId: string;
	locale: Locale;
	value?: string | null;
	onChange: (id: string | null) => void;
	label?: string;
	protectedIds?: string[];
}) {
	const t = copy[locale];
	const { data: session, isPending } = authClient.useSession();
	const context = `${siteId}:${session?.user.id ?? ""}:${session?.session.id ?? ""}`;
	const live = useRef({ context, onChange, value, protectedIds, mounted: true });
	live.current.context = context;
	live.current.onChange = onChange;
	live.current.value = value;
	live.current.protectedIds = protectedIds;
	const [library, setLibrary] = useState<{ context: string; items: Asset[] }>({
		context: "",
		items: [],
	});
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [busyAction, setBusyAction] = useState("");
	// The asset this view is uploading right now: its pending row is in progress, not abandoned.
	const [uploadingId, setUploadingId] = useState<string | null>(null);
	const [error, setError] = useState<keyof typeof copy.en | "">("");
	const [notice, setNotice] = useState<"success" | "deleted" | "deletionPending" | "detached" | "">(
		"",
	);
	const [confirm, setConfirm] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [previewRefresh, setPreviewRefresh] = useState(0);
	const operation = useRef(false);
	const epoch = useRef(0);
	const request = useRef(0);
	const items = library.context === context ? library.items : [];
	const { urls, loading: urlsLoading } = useAssetUrlState(
		siteId,
		open
			? [...items.filter((a) => a.status === "ready").map((a) => a.id), ...(value ? [value] : [])]
			: value
				? [value]
				: [],
		previewRefresh,
	);
	const canAct = !!session?.user.id && !isPending && !busy;

	/** Maps stable server error codes to localized, non-sensitive feedback. */
	const explain = useCallback((cause: unknown) => {
		const code = cause instanceof ApiError ? cause.code : "";
		return Object.hasOwn(copy.en, code) ? (code as keyof typeof copy.en) : "failed";
	}, []);

	/** Discards stale list responses after an upload, session change or later refresh. */
	const load = useCallback(async () => {
		if (!session?.user.id || isPending) return;
		const ticket = ++request.current;
		setLoading(true);
		try {
			const result = await api<Asset[]>(`/api/sites/${siteId}/assets`);
			if (live.current.mounted && live.current.context === context && ticket === request.current)
				setLibrary({ context, items: result });
		} catch (cause) {
			if (live.current.mounted && live.current.context === context && ticket === request.current)
				setError(explain(cause));
		} finally {
			if (live.current.mounted && live.current.context === context && ticket === request.current)
				setLoading(false);
		}
	}, [context, siteId, session?.user.id, isPending, explain]);

	useEffect(() => {
		++epoch.current;
		live.current.mounted = true;
		operation.current = false;
		setBusy(false);
		setLoading(false);
		setError("");
		setNotice("");
		setConfirm(null);
		setOpen(false);
		void load();
		return () => {
			++epoch.current;
			live.current.mounted = false;
			++request.current;
		};
	}, [load]);

	/** Serializes mutations and commits feedback only to the current mounted owner/site. */
	async function mutate(name: string, action: (current: () => boolean) => Promise<void>) {
		if (!canAct || operation.current) return;
		operation.current = true;
		setBusyAction(name);
		setBusy(true);
		setError("");
		setNotice("");
		++request.current;
		const startedEpoch = epoch.current;

		/** Rejects completion work from stale requests, sessions or unmounted views. */
		const current = () =>
			live.current.mounted && live.current.context === context && epoch.current === startedEpoch;

		try {
			await action(current);
		} catch (cause) {
			if (current()) setError(explain(cause));
		} finally {
			if (current()) {
				operation.current = false;
				setBusy(false);
				setLoading(false);
			}
		}
	}

	/** Updates metadata without persisting the signed upload URL in component state. */
	function replaceAsset(asset: Asset) {
		++request.current;
		setLibrary((previous) => ({
			context,
			items: [
				asset,
				...(previous.context === context ? previous.items : []).filter((a) => a.id !== asset.id),
			],
		}));
	}

	/** Uploads directly without application cookies, then attaches only the verified UUID. */
	async function upload(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (
			!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
			file.size === 0 ||
			file.size > 5 * 1024 * 1024
		) {
			setError("invalid");
			return;
		}
		await mutate("upload", async (current) => {
			const intent = await api<UploadIntent>(`/api/sites/${siteId}/assets/upload-intent`, "POST", {
				mime: file.type,
				size: file.size,
			});
			if (!current()) return;
			const { uploadUrl, uploadHeaders, uploadExpiresIn: _expires, ...asset } = intent;
			replaceAsset(asset);
			setUploadingId(asset.id);
			setOpen(true);
			try {
				let response: Response;
				try {
					response = await fetch(uploadUrl, {
						method: "PUT",
						headers: uploadHeaders,
						body: file,
						credentials: "omit",
						referrerPolicy: "no-referrer",
					});
				} catch {
					throw new ApiError("PUT_FAILED", "Upload failed", 0);
				}
				if (!current()) return;
				if (!response.ok) throw new ApiError("PUT_FAILED", "Upload failed", response.status);
				const ready = await api<Asset>(`/api/sites/${siteId}/assets/${intent.id}/complete`, "POST");
				if (!current()) return;
				if (ready.status !== "ready")
					throw new ApiError("ASSET_STATE_CONFLICT", "Asset not ready", 409);
				replaceAsset(ready);
				live.current.onChange(ready.id);
				setNotice("success");
			} catch (cause) {
				// The server discards a file it refused (422); only other failures keep a retryable row.
				if (cause instanceof ApiError && cause.status === 422)
					setLibrary((previous) => ({
						...previous,
						items: previous.items.filter((item) => item.id !== asset.id),
					}));
				throw cause;
			} finally {
				setUploadingId(null);
			}
		});
	}

	/** Removes only this local reference; autosave and release retention still own persistence. */
	function detach() {
		if (!canAct) return;
		live.current.onChange(null);
		setError("");
		setNotice("detached");
	}

	/** Retries server verification when a browser upload succeeded but completion was interrupted. */
	async function complete(id: string) {
		await mutate(`complete:${id}`, async (current) => {
			const asset = await api<Asset>(`/api/sites/${siteId}/assets/${id}/complete`, "POST");
			if (!current()) return;
			replaceAsset(asset);
			if (asset.status === "ready") {
				live.current.onChange(asset.id);
				setNotice("success");
			}
		});
	}

	/** Requests deletion after explicit confirmation and preserves reference-protection errors. */
	async function remove(id: string) {
		if (live.current.value === id || live.current.protectedIds.includes(id)) {
			setError("protectedHint");
			return;
		}
		await mutate(`delete:${id}`, async (current) => {
			const result = await api<{ id: string; status: Asset["status"] }>(
				`/api/sites/${siteId}/assets/${id}`,
				"DELETE",
			);
			if (!current()) return;
			setLibrary((previous) => ({
				context,
				items: previous.items.flatMap((a) =>
					a.id !== id ? [a] : result.status === "deleted" ? [] : [{ ...a, status: result.status }],
				),
			}));
			setConfirm(null);
			setNotice(result.status === "deleted" ? "deleted" : "deletionPending");
		});
	}

	return (
		<fieldset className={styles.picker} dir={locale === "ar" ? "rtl" : "ltr"}>
			<legend>{label || t.label}</legend>
			<p className={styles.hint}>{t.hint}</p>
			<div className={styles.actions}>
				<label className={styles.upload} aria-disabled={!canAct}>
					<ButtonContent loading={busy && busyAction === "upload"}>{t.upload}</ButtonContent>
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						disabled={!canAct}
						onChange={upload}
					/>
				</label>
				<button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
					{open ? t.closeLibrary : t.browse}
				</button>
				<button
					type="button"
					disabled={!canAct || loading}
					onClick={() => {
						setError("");
						void load();
					}}
				>
					<ButtonContent loading={loading}>{t.refresh}</ButtonContent>
				</button>
				{value && (
					<button type="button" disabled={!canAct} onClick={detach}>
						{t.clear}
					</button>
				)}
			</div>
			{error && (
				<p role="alert" className={styles.error}>
					{t[error]}
				</p>
			)}
			{notice && (
				<p role="status" className={styles.hint}>
					{t[notice]}
				</p>
			)}
			{!open && value && (
				<AssetPreview
					selected
					url={urls[value]}
					loading={urlsLoading}
					loadingLabel={t.previewLoading}
					label={t.selected}
					unavailable={t.previewUnavailable}
					retryLabel={t.previewRetry}
					disabled={!canAct}
					onRetry={() => setPreviewRefresh((n) => n + 1)}
				/>
			)}
			{open && loading && (
				<p role="status" className={styles.hint}>
					{t.loading}
				</p>
			)}
			{open && !loading && !items.length && <p className={styles.hint}>{t.empty}</p>}
			{open && (
				<div className={styles.grid}>
					{items.map((asset) => (
						<div key={asset.id} className={styles.card}>
							{asset.status === "ready" ? (
								<AssetPreview
									url={urls[asset.id]}
									loading={urlsLoading}
									loadingLabel={t.previewLoading}
									label={t.preview}
									unavailable={t.previewUnavailable}
									retryLabel={t.previewRetry}
									disabled={!canAct}
									onRetry={() => setPreviewRefresh((n) => n + 1)}
								/>
							) : (
								<div className={styles.placeholder}>
									{asset.status !== "pending"
										? t.deleting
										: uploadingId === asset.id
											? t.uploading
											: t.pending}
								</div>
							)}
							<small dir="ltr">
								{asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ""}
								{Math.ceil(asset.size / 1024)} KB
							</small>
							{asset.status === "ready" && (
								<button
									type="button"
									disabled={!canAct}
									aria-pressed={value === asset.id}
									onClick={() => live.current.onChange(asset.id)}
								>
									{value === asset.id ? t.selected : t.choose}
								</button>
							)}
							{value === asset.id && (
								<button type="button" disabled={!canAct} onClick={detach}>
									{t.clear}
								</button>
							)}
							{asset.status === "pending" && uploadingId !== asset.id && (
								<button type="button" disabled={!canAct} onClick={() => void complete(asset.id)}>
									<ButtonContent loading={busy && busyAction === `complete:${asset.id}`}>
										{t.complete}
									</ButtonContent>
								</button>
							)}
							{confirm === asset.id ? (
								<>
									<p className={styles.hint}>{t.deleteHint}</p>
									<button
										type="button"
										disabled={!canAct || value === asset.id || protectedIds.includes(asset.id)}
										className={styles.danger}
										onClick={() => void remove(asset.id)}
									>
										<ButtonContent loading={busy && busyAction === `delete:${asset.id}`}>
											{t.confirmDelete}
										</ButtonContent>
									</button>
									<button type="button" disabled={!canAct} onClick={() => setConfirm(null)}>
										{t.cancel}
									</button>
								</>
							) : (
								<button
									type="button"
									disabled={!canAct || value === asset.id || protectedIds.includes(asset.id)}
									className={styles.danger}
									onClick={() => setConfirm(asset.id)}
								>
									{asset.status === "deleting" ? t.retryDelete : t.remove}
								</button>
							)}
							{(value === asset.id || protectedIds.includes(asset.id)) && (
								<p className={styles.hint}>{t.protectedHint}</p>
							)}
						</div>
					))}
				</div>
			)}
		</fieldset>
	);
}
