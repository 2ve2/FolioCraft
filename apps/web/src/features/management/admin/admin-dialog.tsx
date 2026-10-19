"use client";
import type { Locale } from "@ichnara/contracts";
import { X } from "lucide-react";
import { type ReactNode, type Ref, useEffect, useId, useRef } from "react";
import styles from "./admin.module.css";

/** Contains administrative confirmation focus and restores the triggering control on dismissal. */
export function AdminDialog({
	title,
	locale,
	onClose,
	busy,
	headingRef,
	drawer = false,
	children,
}: {
	drawer?: boolean;
	title: string;
	locale: Locale;
	onClose: () => void;
	busy: boolean;
	headingRef: Ref<HTMLHeadingElement>;
	children: ReactNode;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	useEffect(() => {
		const element = dialog.current;
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		element?.showModal();
		return () => {
			element?.close();
			document.body.style.overflow = overflow;
			previous?.focus({ preventScroll: true });
		};
	}, []);
	return (
		<dialog
			ref={dialog}
			className={`${styles.dialog} ${drawer ? styles.drawer : ""}`}
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-labelledby={titleId}
			onKeyDown={(event) => {
				if (event.key !== "Tab") return;
				const controls = Array.from(
					event.currentTarget.querySelectorAll<HTMLElement>(
						'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
					),
				).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
				const first = controls[0],
					last = controls.at(-1);
				if (!first || !last) {
					event.preventDefault();
					return;
				}
				if (
					event.shiftKey &&
					(document.activeElement === first ||
						!controls.includes(document.activeElement as HTMLElement))
				) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}}
			onCancel={(event) => {
				event.preventDefault();
				if (!busy) onClose();
			}}
		>
			<header className={styles.dialogHeader}>
				<h2 id={titleId} ref={headingRef} tabIndex={-1} dir="auto">
					{title}
				</h2>
				<button
					type="button"
					className={styles.iconButton}
					onClick={onClose}
					disabled={busy}
					aria-label={locale === "ar" ? "إغلاق" : "Close"}
				>
					<X size={18} />
				</button>
			</header>
			<div className={styles.dialogBody}>{children}</div>
		</dialog>
	);
}
