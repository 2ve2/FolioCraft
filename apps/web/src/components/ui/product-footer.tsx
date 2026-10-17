import type { Locale } from "@folio/contracts";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import styles from "./product-footer.module.css";

/** Shares real product destinations across public platform pages, independently of user portfolios. */
export function ProductFooter({ locale }: { locale: Locale }) {
	const ar = locale === "ar";
	const home = `/?lang=${locale}`;

	return (
		<footer className={styles.footer} lang={locale} dir={ar ? "rtl" : "ltr"}>
			<div className={styles.inner}>
				<div className={styles.top}>
					<div className={styles.identity}>
						<Link href={home} aria-label={ar ? "Ichnara — الرئيسية" : "Ichnara — Home"}>
							<Brand />
						</Link>
						<p>
							{ar
								? "أعمالك تستحق مساحة تليق بها. اجمع قصتك ومشاريعك وخبراتك في بورتفوليو يعكسك."
								: "Give your work a considered home. Bring your story, projects and experience together in a portfolio that feels like you."}
						</p>
						<span className={styles.signature}>
							{ar ? "قالب واحد. لمستك الخاصة." : "One considered layout. Your own expression."}
						</span>
					</div>
					<nav className={styles.group} aria-label={ar ? "اكتشف المنصة" : "Discover Ichnara"}>
						<h2>{ar ? "اكتشف المنصة" : "Discover"}</h2>
						<Link href={home}>{ar ? "الرئيسية" : "Home"}</Link>
						<Link href={`${home}#how-it-works`}>{ar ? "كيف يعمل" : "How it works"}</Link>
						<Link href={`${home}#example`}>{ar ? "استعرض القالب" : "See the template"}</Link>
					</nav>
					<nav className={styles.group} aria-label={ar ? "مساحتك" : "Your workspace"}>
						<h2>{ar ? "مساحتك" : "Your workspace"}</h2>
						<Link href={`/login?lang=${locale}`}>{ar ? "تسجيل الدخول" : "Sign in"}</Link>
						<Link href={`/signup?lang=${locale}`}>{ar ? "إنشاء حساب" : "Create an account"}</Link>
						<Link className={styles.studio} href={`/studio?lang=${locale}`}>
							{ar ? "افتح المحرر" : "Open Studio"}
							<ArrowUpRight size={16} aria-hidden="true" />
						</Link>
					</nav>
				</div>
				<div className={styles.bottom}>
					<span>
						{ar ? "© 2026 Ichnara. جميع الحقوق محفوظة." : "© 2026 Ichnara. All rights reserved."}
					</span>
					<span>
						{ar
							? "بالعربية والإنجليزية، من أول فكرة إلى رابطك."
							: "Arabic & English. From your first idea to your own link."}
					</span>
				</div>
			</div>
		</footer>
	);
}
