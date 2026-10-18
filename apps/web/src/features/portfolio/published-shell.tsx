import type { Locale } from "@ichnara/contracts";
import type { ReactNode } from "react";
import { brandArtwork } from "../../components/ui/brand-artwork";
import { webOrigin } from "../../lib/public-metadata";
import styles from "./published-shell.module.css";

/** Adds platform navigation around published releases without reading private draft data. */
export function PublishedShell({ locale, children }: { locale: Locale; children: ReactNode }) {
	return (
		<div className={styles.shell} dir={locale === "ar" ? "rtl" : "ltr"}>
			{children}
			<a className={styles.badge} href={`${webOrigin}/?lang=${locale}`}>
				<span className={styles.label}>
					{locale === "ar" ? "زيارة منصة إيكنارا" : "Visit Ichnara"}
				</span>
				<svg
					width="26"
					height="26"
					viewBox="0 0 235 240"
					fill="currentColor"
					aria-hidden="true"
					focusable="false"
				>
					{brandArtwork.en.groups[0].paths.map((path) => (
						<path key={path.d} d={path.d} />
					))}
				</svg>
			</a>
		</div>
	);
}
