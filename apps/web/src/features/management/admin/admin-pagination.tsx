import type { Locale } from "@ichnara/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { text } from "../shared/copy";
import styles from "./admin.module.css";

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
