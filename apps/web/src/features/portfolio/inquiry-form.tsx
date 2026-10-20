"use client";

import type { Locale } from "@ichnara/contracts";
import { type FormEvent, useRef, useState } from "react";
import { ButtonContent } from "../../components/ui/button-content";

const copy = {
	ar: {
		preview: "للمعاينة فقط؛ يمكنك إرسال الرسائل من الموقع المنشور.",
		name: "الاسم",
		email: "البريد الإلكتروني",
		message: "رسالتك",
		send: "إرسال الرسالة",
		sending: "جارٍ الإرسال…",
		success: "تم حفظ رسالتك في صندوق استفسارات صاحب الموقع.",
		failure: "تعذر إرسال الرسالة. حاول مرة أخرى.",
		limited: "وصلت إلى حد الإرسال. انتظر قليلًا ثم حاول مجددًا.",
		invalid: "تحقق من الاسم والبريد والرسالة (من 10 إلى 3000 حرف).",
		unavailable: "هذا الموقع غير متاح لاستقبال الرسائل حاليًا.",
	},
	en: {
		preview: "Preview only; messages can be sent on the published site.",
		name: "Name",
		email: "Email",
		message: "Your message",
		send: "Send message",
		sending: "Sending…",
		success: "Your message was saved to the portfolio owner's inbox.",
		failure: "Unable to send your message. Please try again.",
		limited: "The sending limit was reached. Please wait and try again.",
		invalid: "Check your name, email and message (10 to 3000 characters).",
		unavailable: "This portfolio is currently unavailable for messages.",
	},
};

/** Submits public inquiries while keeping preview forms non-submitting. */
export function InquiryForm({
	slug,
	locale,
	preview = false,
}: {
	slug: string;
	locale: Locale;
	preview?: boolean;
}) {
	const t = copy[locale];
	const [pending, setPending] = useState(false);
	const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
	const sending = useRef(false);

	/** Validates and submits the public contact form with truthful result feedback. */
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (preview || sending.current) return;
		const form = event.currentTarget;
		const values = new FormData(form);
		sending.current = true;
		setPending(true);
		setStatus(null);
		try {
			const origin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
			const response = await fetch(
				`${origin}/api/public/sites/${encodeURIComponent(slug)}/inquiries`,
				{
					method: "POST",
					credentials: "omit",
					cache: "no-store",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: String(values.get("name") || "").trim(),
						email: String(values.get("email") || "").trim(),
						message: String(values.get("message") || "").trim(),
						website: String(values.get("website") || ""),
					}),
				},
			);
			const result = await response.json().catch(() => null);
			if (!response.ok || !result?.status || typeof result.result?.id !== "string") {
				setStatus({
					text:
						response.status === 429
							? t.limited
							: response.status === 400
								? t.invalid
								: response.status === 404
									? t.unavailable
									: t.failure,
					error: true,
				});
				return;
			}
			form.reset();
			setStatus({ text: t.success, error: false });
		} catch {
			setStatus({ text: t.failure, error: true });
		} finally {
			sending.current = false;
			setPending(false);
		}
	}

	return (
		<form
			className="folio__inquiry"
			onSubmit={submit}
			aria-busy={pending}
			aria-description={preview ? t.preview : undefined}
		>
			<label>
				{t.name}
				<input
					name="name"
					autoComplete="name"
					dir="auto"
					required
					maxLength={100}
					disabled={preview || pending}
				/>
			</label>
			<label>
				{t.email}
				<input
					name="email"
					type="email"
					autoComplete="email"
					dir="ltr"
					required
					maxLength={254}
					disabled={preview || pending}
				/>
			</label>
			<label>
				{t.message}
				<textarea
					name="message"
					dir="auto"
					required
					minLength={10}
					maxLength={3000}
					rows={5}
					disabled={preview || pending}
				/>
			</label>
			<div className="folio__honeypot" aria-hidden="true">
				<label>
					Website
					<input name="website" tabIndex={-1} autoComplete="off" disabled={preview || pending} />
				</label>
			</div>
			<button type="submit" className="folio__button" disabled={preview || pending}>
				<ButtonContent loading={pending}>{t.send}</ButtonContent>
			</button>
			{status && (
				<p className="folio__form-status" role={status.error ? "alert" : "status"}>
					{status.text}
				</p>
			)}
		</form>
	);
}
