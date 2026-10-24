"use client";
import type { Locale } from "@ichnara/contracts";
import { MonitorSmartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./large-screen-notice.module.css";

// One answer per browser: whoever continues on a phone has already chosen to.
const STORAGE_KEY = "ichnara-large-screen-notice";
const PHONE_QUERY = "(max-width: 760px)";

const text = {
	ar: {
		title: "الأفضل على شاشة أكبر",
		studio:
			"الاستوديو مصمم للتحرير على الكمبيوتر أو التابلت. تقدر تكمل من الجوال، لكن المحرر والمعاينة يكونان أضيق.",
		admin:
			"لوحة الإدارة مصممة للكمبيوتر أو التابلت. تقدر تكمل من الجوال، لكن الجداول والتفاصيل تكون أضيق.",
		continue: "متابعة على الجوال",
	},
	en: {
		title: "Best on a larger screen",
		studio:
			"The studio is designed for editing on a computer or tablet. You can continue on your phone, but the editor and preview are narrower.",
		admin:
			"The administration console is designed for a computer or tablet. You can continue on your phone, but tables and details are narrower.",
		continue: "Continue on phone",
	},
} as const;

/** Suggests a larger screen once per browser when the studio or console opens on a phone. */
export function LargeScreenNotice({ locale, area }: { locale: Locale; area: "studio" | "admin" }) {
	const t = text[locale];
	const dialog = useRef<HTMLDialogElement>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		let seen = false;
		try {
			seen = window.localStorage.getItem(STORAGE_KEY) === "seen";
		} catch {}
		if (!seen && window.matchMedia(PHONE_QUERY).matches) setOpen(true);
	}, []);

	useEffect(() => {
		// showModal moves focus to the first control, the continue button.
		if (open && !dialog.current?.open) dialog.current?.showModal();
	}, [open]);

	/** Remembers the choice and closes; storage can be unavailable, which only means it may return. */
	function dismiss() {
		try {
			window.localStorage.setItem(STORAGE_KEY, "seen");
		} catch {}
		dialog.current?.close();
		setOpen(false);
	}

	if (!open) return null;
	return (
		<dialog
			ref={dialog}
			className={styles.notice}
			dir={locale === "ar" ? "rtl" : "ltr"}
			lang={locale}
			aria-labelledby="large-screen-title"
			onCancel={(event) => {
				event.preventDefault();
				dismiss();
			}}
		>
			<span className={styles.icon} aria-hidden="true">
				<MonitorSmartphone size={26} />
			</span>
			<h2 id="large-screen-title">{t.title}</h2>
			<p>{t[area]}</p>
			<button type="button" className="primary wide" onClick={dismiss}>
				{t.continue}
			</button>
		</dialog>
	);
}
