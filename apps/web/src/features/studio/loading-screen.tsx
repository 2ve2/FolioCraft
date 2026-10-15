import type { Locale } from "@folio/contracts";
import { Circle, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "../../components/ui/brand";

/** A focused branded shell for actual session/site loading and recoverable errors. */
export function LoadingScreen({
	locale,
	message,
	error = false,
	children,
}: {
	locale: Locale;
	message: string;
	error?: boolean;
	children?: ReactNode;
}) {
	return (
		<main className="loading-screen" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
			<div className="loading-brand">
				<Brand />
			</div>
			<section className={`loading-card${error ? " loading-card--error" : ""}`} aria-busy={!error}>
				<div className="loading-emblem" aria-hidden="true">
					{error ? <Circle size={32} /> : <LoaderCircle size={32} className="spin" />}
				</div>
				<h1>
					{locale === "ar"
						? error
							? "تعذر فتح مساحة العمل"
							: "نجهّز مساحة عملك"
						: error
							? "Workspace unavailable"
							: "Preparing your workspace"}
				</h1>
				<p role={error ? "alert" : "status"}>{message}</p>
				{!error && (
					<div className="loading-track" aria-hidden="true">
						<span />
					</div>
				)}
				{children && <div className="loading-actions">{children}</div>}
			</section>
			<p className="loading-footnote">
				FolioCraft · {locale === "ar" ? "مساحة لأعمالك" : "A home for your work"}
			</p>
		</main>
	);
}
