"use client";
import type { Locale } from "@folio/contracts";
import { useState } from "react";
import { SelectControl } from "../../components/ui/select-control";
import { AdminPanel } from "../../features/management/admin-panel";
import { authClient } from "../../lib/api";

/** Administration remains accessible without creating a personal portfolio. */
export default function Administration() {
	const [locale, setLocale] = useState<Locale>("en");
	const { data: session, isPending, error } = authClient.useSession();
	const admin = session?.user.role?.split(",").includes("admin");
	return (
		<main className="standalone-admin" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<div className="content-actions">
				<a className="secondary" href="/">
					{locale === "ar" ? "العودة للاستوديو" : "Back to studio"}
				</a>
				<div className="field">
					<span>{locale === "ar" ? "اللغة" : "Language"}</span>
					<SelectControl
						label={locale === "ar" ? "اللغة" : "Language"}
						value={locale}
						onChange={(value) => setLocale(value as Locale)}
						options={[
							{ value: "ar", label: "العربية", code: "AR" },
							{ value: "en", label: "English", code: "EN" },
						]}
					/>
				</div>
			</div>
			{isPending ? (
				<p role="status">{locale === "ar" ? "جارٍ التحقق…" : "Checking session…"}</p>
			) : error ? (
				<p role="alert">
					{locale === "ar"
						? "تعذر التحقق من الجلسة. أعد تحميل الصفحة."
						: "Session check failed. Reload the page."}
				</p>
			) : admin ? (
				<AdminPanel locale={locale} standalone />
			) : (
				<p role="alert">
					{locale === "ar"
						? "هذه الصفحة تتطلب تسجيل الدخول بحساب مسؤول مصرح له."
						: "Sign in with an authorized administrator account to access this page."}
				</p>
			)}
		</main>
	);
}
