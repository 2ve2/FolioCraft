import type { Locale } from "@ichnara/contracts";
import { text } from "./copy";
import styles from "./management.module.css";

/** Renders bounded navigation for twenty-item resource pages once there is more than one page. */
export function Pager({
	count,
	offset,
	hasMore,
	disabled,
	locale,
	change,
}: {
	count: number;
	offset: number;
	hasMore: boolean;
	disabled: boolean;
	locale: Locale;
	change: (offset: number) => void;
}) {
	const t = text[locale];
	// A single page (including an empty list) has nothing to navigate.
	if (offset === 0 && !hasMore) return null;
	return (
		<div className={styles.actions}>
			<button
				type="button"
				disabled={disabled || offset === 0}
				onClick={() => change(Math.max(0, offset - 20))}
			>
				{t.previous}
			</button>
			<span>{count ? `${offset + 1}–${offset + count}` : "0"}</span>
			<button
				type="button"
				disabled={disabled || !hasMore || offset >= 10000}
				onClick={() => change(offset + 20)}
			>
				{t.next}
			</button>
			{hasMore && offset >= 10000 && <span>{t.bounded}</span>}
		</div>
	);
}
