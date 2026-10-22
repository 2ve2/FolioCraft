import { useState } from "react";
import styles from "./asset-picker.module.css";

/** Replaces failed image downloads with honest feedback and an explicit permission refresh. */
export function AssetPreview({
	url,
	loading = false,
	loadingLabel,
	label,
	unavailable,
	retryLabel,
	disabled,
	onRetry,
	selected = false,
}: {
	url?: string;
	/** True while the private link is still being requested; not a failure. */
	loading?: boolean;
	loadingLabel?: string;
	label: string;
	unavailable: string;
	retryLabel: string;
	disabled: boolean;
	onRetry: () => void;
	selected?: boolean;
}) {
	const [failedSource, setFailedSource] = useState<string | null>(null);
	if (url && url !== failedSource)
		return (
			// These owned, expiring URLs cannot be passed through the Next image optimizer.
			// biome-ignore lint/performance/noImgElement: private signed image permission
			<img
				className={selected ? styles.selectedImage : undefined}
				src={url}
				alt={label}
				referrerPolicy="no-referrer"
				onError={() => setFailedSource(url)}
			/>
		);
	if (loading)
		return (
			<div className={styles.placeholder} role="status" aria-busy="true">
				{loadingLabel}
			</div>
		);
	return (
		<div className={styles.previewFailure}>
			<div className={styles.placeholder} role="status">
				{unavailable}
			</div>
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					setFailedSource(null);
					onRetry();
				}}
			>
				{retryLabel}
			</button>
		</div>
	);
}
