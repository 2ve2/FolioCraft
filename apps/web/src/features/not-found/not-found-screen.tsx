"use client";

import { ArrowLeft, ArrowRight, FileQuestion, House, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { Brand } from "../../components/ui/brand";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { localeHref } from "../../lib/locale";
import { useInterfaceLocale, useLocalePinned } from "../../lib/use-interface-locale";
import styles from "./not-found.module.css";

/** Offers localized recovery links for unmatched routes and missing public resources. */
export function NotFoundScreen() {
	const [locale, setLocale] = useInterfaceLocale();
	// Inside a published portfolio the language follows the release, so a switch could not apply.
	const pinned = useLocalePinned();
	const ar = locale === "ar";
	const Arrow = ar ? ArrowLeft : ArrowRight;

	return (
		<div className={styles.page} lang={locale} dir={ar ? "rtl" : "ltr"}>
			<header className={styles.header}>
				<Link href={localeHref(locale, "/")} aria-label={ar ? "الصفحة الرئيسية" : "Home"}>
					<Brand locale={locale} />
				</Link>
				{!pinned && (
					<LanguageSwitch
						locale={locale}
						onChange={setLocale}
						label={ar ? "لغة الواجهة" : "Interface language"}
					/>
				)}
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
					<p className={styles.eyebrow}>{ar ? "خطأ 404" : "Error 404"}</p>
					<h1>{ar ? "لم نعثر على هذه الصفحة" : "We can’t find this page"}</h1>
					<p className={styles.description}>
						{ar
							? "ربما الرابط مكتوب بشكل غير صحيح، أو أن الصفحة نُقلت أو حُذفت. تحقق من العنوان أو تابع من هنا."
							: "The link may be mistyped, or the page may have moved or been removed. Check the address or continue from here."}
					</p>
					<nav className={styles.actions} aria-label={ar ? "متابعة التصفح" : "Continue browsing"}>
						<Link className={styles.primary} href={localeHref(locale, "/")}>
							<House size={18} aria-hidden="true" />
							{ar ? "العودة للرئيسية" : "Back to home"}
						</Link>
						<Link className={styles.secondary} href={localeHref(locale, "/studio")}>
							{ar ? "فتح المحرر" : "Open Studio"}
							<Arrow size={18} aria-hidden="true" />
						</Link>
					</nav>
					<p className={styles.hint}>
						<PanelsTopLeft size={16} aria-hidden="true" />
						{ar
							? "تبحث عن معرض أعمال شخص ما؟ اطلب منه الرابط الصحيح."
							: "Looking for someone’s portfolio? Ask them for the exact link."}
					</p>
				</div>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
