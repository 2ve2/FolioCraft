import type { Locale } from "@ichnara/contracts";
import type { ReactNode } from "react";
import { brandArtwork } from "../../components/ui/brand-artwork";
import { localeHref } from "../../lib/locale";
import { webOrigin } from "../../lib/public-metadata";
import styles from "./published-shell.module.css";

/** Adds platform navigation around published releases without reading private draft data.
 * The shell is the page's main landmark; the shared portfolio markup stays landmark-neutral so the
 * Studio preview can embed it inside the Studio's own main region. */
export function PublishedShell({ locale, children }: { locale: Locale; children: ReactNode }) {
	return (
		<main className={styles.shell} dir={locale === "ar" ? "rtl" : "ltr"}>
			{children}
			<a className={styles.badge} href={`${webOrigin}${localeHref(locale, "/")}`}>
				<span className={styles.label}>
					{locale === "ar" ? "زيارة منصة إيكنارا" : "Visit Ichnara"}
				</span>
				<svg
					width="26"
					height="26"
					// The emblem's own outline bounds, so it sits centred in the round badge.
					viewBox="0 2 208 236"
					fill="currentColor"
					aria-hidden="true"
					focusable="false"
				>
					{brandArtwork.en.groups[0].paths.map((path) => (
						<path key={path.d} d={path.d} />
					))}
				</svg>
			</a>
		</main>
	);
}
