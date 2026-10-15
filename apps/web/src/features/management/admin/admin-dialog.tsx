"use client";
import type { Locale } from "@folio/contracts";
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
	children,
}: {
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
			className={styles.dialog}
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-labelledby={titleId}
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
