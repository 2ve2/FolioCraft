"use client";

import Link from "next/link";
import { Brand } from "../../components/ui/brand";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { ProductFooter } from "../../components/ui/product-footer";
import { localeHref } from "../../lib/locale";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import styles from "./legal.module.css";
import { type LegalDocument, legalCopy, legalDraftDate } from "./legal-copy";

const documents: LegalDocument[] = ["privacy", "terms", "content-policy"];

/** Renders one bilingual legal document with links to its sibling documents. */
export function LegalPage({ document }: { document: LegalDocument }) {
	const [locale, setLocale] = useInterfaceLocale();
	const ar = locale === "ar";
	const copy = legalCopy[locale];
	const text = copy.documents[document];

	return (
		<div className={styles.page} lang={locale} dir={ar ? "rtl" : "ltr"}>
			<header className={styles.header}>
				<Link href={localeHref(locale, "/")} aria-label={ar ? "الصفحة الرئيسية" : "Home"}>
					<Brand locale={locale} />
				</Link>
				<LanguageSwitch
					locale={locale}
					onChange={setLocale}
					label={ar ? "لغة الواجهة" : "Interface language"}
				/>
			</header>
			<main className={styles.main}>
				<nav className={styles.tabs} aria-label={ar ? "الوثائق القانونية" : "Legal documents"}>
					{documents.map((item) => (
						<Link
							key={item}
							href={localeHref(locale, `/${item}`)}
							aria-current={item === document ? "page" : undefined}
						>
							{copy.nav[item]}
						</Link>
					))}
				</nav>
				<article className={styles.article}>
					<h1>{text.title}</h1>
					<p className={styles.summary}>{text.summary}</p>
					<p className={styles.notice} role="note">
						{copy.draftNotice}
					</p>
					<p className={styles.updated}>
						{copy.updated}:{" "}
						<time dateTime={legalDraftDate} dir="ltr">
							{legalDraftDate}
						</time>
					</p>
					{text.sections.map((section) => (
						<section key={section.heading}>
							<h2>{section.heading}</h2>
							{section.paragraphs?.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
							{section.items && (
								<ul>
									{section.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							)}
						</section>
					))}
				</article>
			</main>
			<ProductFooter locale={locale} />
		</div>
	);
}
