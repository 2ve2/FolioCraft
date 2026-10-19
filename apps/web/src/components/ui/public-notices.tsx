"use client";
import type { Locale, PublicNotice } from "@ichnara/contracts";
import { useEffect, useState } from "react";
import { apiOrigin } from "../../lib/api-origin";
import styles from "./public-notices.module.css";
/** Anonymous minimized notices refresh at window boundaries; portfolio rendering never mounts this. */
export function PublicNotices({ locale }: { locale: Locale }) {
	const [items, setItems] = useState<PublicNotice[]>([]);
	useEffect(() => {
		let current = true;
		const load = () =>
			fetch(`${apiOrigin}/api/public/notices`, { credentials: "omit", cache: "no-store" })
				.then((r) => (r.ok ? r.json() : null))
				.then((body) => {
					if (current) setItems(body?.status ? body.result.items : []);
				})
				.catch(() => {
					if (current) setItems([]);
				});
		void load();
		const interval = setInterval(() => void load(), 60000);
		return () => {
			current = false;
			clearInterval(interval);
		};
	}, []);
	useEffect(() => {
		const next = items
			.map((item) => new Date(item.endsAt).getTime())
			.filter((time) => time > Date.now())
			.sort((a, b) => a - b)[0];
		if (!next) return;
		const timer = setTimeout(
			() => setItems((rows) => rows.filter((row) => new Date(row.endsAt).getTime() > Date.now())),
			Math.min(2147483647, Math.max(1, next - Date.now())),
		);
		return () => clearTimeout(timer);
	}, [items]);
	const now = Date.now(),
		visible = items.filter(
			(n) => new Date(n.startsAt).getTime() <= now && new Date(n.endsAt).getTime() > now,
		);
	if (!visible.length) return null;
	return (
		<aside
			className={styles.banner}
			lang={locale}
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-label={locale === "ar" ? "تنبيهات النظام" : "System notices"}
			aria-live="polite"
		>
			{visible.map((n) => (
				<p key={n.id} dir="auto">
					<strong>
						{locale === "ar"
							? { info: "معلومة", maintenance: "صيانة", incident: "عطل" }[n.kind]
							: { info: "Information", maintenance: "Maintenance", incident: "Incident" }[n.kind]}
						:{" "}
					</strong>
					{locale === "ar" ? n.messageAr : n.messageEn}
				</p>
			))}
		</aside>
	);
}
