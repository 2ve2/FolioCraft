"use client";
import { type Locale, reportCategories, reportInput } from "@ichnara/contracts";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ButtonContent } from "../../components/ui/button-content";
import { SelectControl } from "../../components/ui/select-control";
import { AdminDialog } from "../management/admin/admin-dialog";
import styles from "./report.module.css";
import { reportCopy } from "./report-copy";

/** Shares the bilingual form between every published template page; private previews cannot submit. */
export function ReportForm({ slug, locale }: { slug: string; locale: Locale }) {
	const t = reportCopy[locale],
		heading = useRef<HTMLHeadingElement>(null),
		sending = useRef(false);
	const [open, setOpen] = useState(false),
		[pending, setPending] = useState(false),
		[feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
	const [category, setCategory] = useState<string>(reportCategories[0]);
	useEffect(() => {
		if (open) heading.current?.focus();
	}, [open]);
	/** Sends no cookies, accepts only the actual server receipt and preserves input on failure. */
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (sending.current) return;
		const form = event.currentTarget,
			values = new FormData(form),
			email = String(values.get("reporterEmail") ?? "").trim();
		const parsed = reportInput.safeParse({
			category,
			message: String(values.get("message") ?? "").trim(),
			...(email ? { reporterEmail: email } : {}),
		});
		if (!parsed.success) {
			setFeedback({ text: t.invalid, error: true });
			return;
		}
		sending.current = true;
		setPending(true);
		setFeedback(null);
		try {
			const origin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
			const response = await fetch(
				`${origin}/api/public/sites/${encodeURIComponent(slug)}/report`,
				{
					method: "POST",
					credentials: "omit",
					cache: "no-store",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(parsed.data),
				},
			);
			const body = await response.json().catch(() => null);
			if (!response.ok || body?.status !== true || body.result?.accepted !== true) {
				setFeedback({
					text:
						response.status === 429
							? t.limited
							: response.status === 400 || response.status === 413
								? t.invalid
								: response.status === 404 || response.status === 503
									? t.unavailable
									: t.failure,
					error: true,
				});
				return;
			}
			form.reset();
			setFeedback({ text: t.success, error: false });
		} catch {
			setFeedback({ text: t.failure, error: true });
		} finally {
			sending.current = false;
			setPending(false);
		}
	}
	return (
		<div className={styles.root}>
			<button
				type="button"
				className={styles.trigger}
				onClick={() => {
					setOpen(true);
					setFeedback(null);
				}}
			>
				{t.title}
			</button>
			{open && (
				<AdminDialog
					title={t.title}
					locale={locale}
					busy={pending}
					headingRef={heading}
					onClose={() => setOpen(false)}
				>
					<p>{t.description}</p>
					<form onSubmit={submit} aria-busy={pending} className={styles.form}>
						<div>
							<span>{t.category}</span>
							<SelectControl
								label={t.category}
								name="category"
								value={category}
								onChange={setCategory}
								disabled={pending}
								options={reportCategories.map((value) => ({ value, label: t[value] }))}
							/>
						</div>
						<label>
							{t.message}
							<textarea
								name="message"
								dir="auto"
								minLength={10}
								maxLength={1000}
								required
								rows={5}
								disabled={pending}
							/>
						</label>
						<label>
							{t.email}
							<input
								name="reporterEmail"
								type="email"
								dir="ltr"
								autoComplete="email"
								maxLength={254}
								disabled={pending}
							/>
						</label>
						<button type="submit" className={styles.submit} disabled={pending}>
							<ButtonContent loading={pending}>{t.send}</ButtonContent>
						</button>
						{feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
					</form>
				</AdminDialog>
			)}
		</div>
	);
}
