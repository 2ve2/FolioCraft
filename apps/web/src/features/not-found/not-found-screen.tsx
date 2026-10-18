"use client";

import { ArrowLeft, ArrowRight, FileQuestion, House, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { Brand } from "../../components/ui/brand";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import styles from "./not-found.module.css";

/** Offers localized recovery links for unmatched routes and missing public resources. */
export function NotFoundScreen() {
	const [locale, setLocale] = useInterfaceLocale();
	const ar = locale === "ar";
	const Arrow = ar ? ArrowLeft : ArrowRight;

	return (
		<div className={styles.page} lang={locale} dir={ar ? "rtl" : "ltr"}>
			<header className={styles.header}>
				<Link href={`/?lang=${locale}`} aria-label={ar ? "الصفحة الرئيسية" : "Home"}>
					<Brand locale={locale} />
				</Link>
				<LanguageSwitch
					locale={locale}
					onChange={setLocale}
					label={ar ? "لغة الواجهة" : "Interface language"}
				/>
			</header>
			<main className={styles.main}>
				<div className={styles.art} aria-hidden="true">
					<span className={styles.orbit} />
					<span className={styles.number}>404</span>
					<span className={styles.file}>
						<FileQuestion size={34} strokeWidth={1.5} />
					</span>
				</div>
				<div className={styles.content}>
					<p className={styles.eyebrow}>
						{ar ? "لنعد إلى المسار الصحيح" : "LET’S GET YOU BACK ON TRACK"}
					</p>
					<h1>{ar ? "هذه الصفحة غير موجودة" : "This page is out of the picture."}</h1>
					<p className={styles.description}>
						{ar
							? "قد يكون الرابط غير صحيح، أو أن المحتوى لم يعد متاحًا. تأكد من العنوان، أو تابع من هنا."
							: "The link may be incorrect, or the content may no longer be available. Check the address, or find your way from here."}
					</p>
					<nav className={styles.actions} aria-label={ar ? "متابعة التصفح" : "Continue browsing"}>
						<Link className={styles.primary} href={`/?lang=${locale}`}>
							<House size={18} aria-hidden="true" />
							{ar ? "العودة للرئيسية" : "Back to home"}
						</Link>
						<Link className={styles.secondary} href={`/studio?lang=${locale}`}>
							{ar ? "فتح المحرر" : "Open Studio"}
							<Arrow size={18} aria-hidden="true" />
						</Link>
					</nav>
					<p className={styles.hint}>
						<PanelsTopLeft size={16} aria-hidden="true" />
						{ar
							? "تبحث عن معرض أعمال؟ تأكد من الرابط مع صاحبه."
							: "Looking for a portfolio? Confirm the link with its owner."}
					</p>
				</div>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
