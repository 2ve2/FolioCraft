"use client";
import type { Locale } from "@ichnara/contracts";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ButtonContent } from "../../components/ui/button-content";
import { authClient } from "../../lib/auth-client";
import { localeHref } from "../../lib/locale";
import styles from "./auth.module.css";
import { recoveryCopy } from "./recovery-copy";
import { recoveryError, requestRecovery } from "./recovery-request";

const RESEND_SECONDS = 60;

const text = {
	ar: {
		title: "تحقّق من بريدك",
		sent: "أرسلنا رابط تفعيل الحساب إلى:",
		next: "افتح الرسالة واضغط الرابط، ثم سجّل الدخول.",
		missing: "لم تصلك الرسالة خلال دقائق؟ تحقّق من مجلد الرسائل غير المرغوبة، أو أعد الإرسال.",
		resend: "إعادة إرسال الرابط",
		wait: (s: number) => `إعادة الإرسال بعد ${s.toLocaleString("ar-EG")} ث`,
		resent: "طلبنا رسالة جديدة. قد تستغرق دقيقة لتصل.",
		login: "تسجيل الدخول",
		other: "استخدام بريد آخر",
	},
	en: {
		title: "Check your email",
		sent: "We sent an activation link to:",
		next: "Open the message and select the link, then sign in.",
		missing: "No message after a few minutes? Check your spam folder or resend it.",
		resend: "Resend link",
		wait: (s: number) => `Resend in ${s}s`,
		resent: "We requested a new message. It can take a minute to arrive.",
		login: "Sign in",
		other: "Use a different email",
	},
} as const;

/**
 * Replaces the sign-up form once Better Auth accepts it. A registered address never reaches this
 * step: the server refuses it by name and the form shows that error instead.
 */
export function SignupSent({
	locale,
	email,
	onBack,
}: {
	locale: Locale;
	email: string;
	onBack: () => void;
}) {
	const t = text[locale];
	const heading = useRef<HTMLHeadingElement>(null);
	const [seconds, setSeconds] = useState(RESEND_SECONDS);
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);

	useEffect(() => heading.current?.focus(), []);
	useEffect(() => {
		if (seconds <= 0) return;
		const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [seconds]);

	/** Requests one more verification message through the native resend endpoint. */
	async function resend() {
		setBusy(true);
		setStatus(null);
		try {
			const failure = await requestRecovery(
				authClient,
				"verify",
				{ email, password: "", confirm: "", token: "" },
				window.location.origin,
				locale,
			);
			setStatus(
				failure
					? { error: true, text: recoveryCopy[locale][recoveryError(failure)] }
					: { error: false, text: t.resent },
			);
		} catch {
			setStatus({ error: true, text: recoveryCopy[locale].failure });
		} finally {
			setBusy(false);
			setSeconds(RESEND_SECONDS);
		}
	}

	return (
		<div className={styles.sent}>
			<span className={styles.sentIcon} aria-hidden="true">
				<MailCheck size={26} />
			</span>
			<h2 ref={heading} tabIndex={-1}>
				{t.title}
			</h2>
			<p role="status">
				{t.sent}{" "}
				<b dir="ltr" className={styles.sentEmail}>
					{email}
				</b>
			</p>
			<p>{t.next}</p>
			<p className={styles.sentNote}>{t.missing}</p>
			{status && (
				<p
					className={status.error ? "error-box" : styles.sentNote}
					role={status.error ? "alert" : "status"}
				>
					{status.text}
				</p>
			)}
			<div className={styles.sentActions}>
				<Link className="primary" href={localeHref(locale, "/login")}>
					{t.login}
				</Link>
				<button
					type="button"
					className="secondary"
					disabled={busy || seconds > 0}
					onClick={() => void resend()}
				>
					<ButtonContent loading={busy}>{seconds > 0 ? t.wait(seconds) : t.resend}</ButtonContent>
				</button>
			</div>
			<button type="button" className="text-button" onClick={onBack}>
				{t.other}
			</button>
		</div>
	);
}
