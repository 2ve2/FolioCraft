import type { Locale } from "@ichnara/contracts";
import { brandArtwork } from "./brand-artwork";

/** Renders the approved locale artwork with inherited header/footer ink and an accessible name. */
export function Brand({ locale = "en" }: { locale?: Locale }) {
	const artwork = brandArtwork[locale];
	return (
		<span className="brand">
			<svg
				width="170"
				height="40"
				viewBox={artwork.viewBox}
				fill="currentColor"
				role="img"
				aria-label={locale === "ar" ? "إيكنارا — Ichnara" : "Ichnara"}
			>
				{artwork.groups.map((group) => (
					<g key={group.transform} transform={group.transform}>
						{group.paths.map((path) => (
							<path key={`${path.d}-${"transform" in path ? path.transform : ""}`} {...path} />
						))}
					</g>
				))}
			</svg>
		</span>
	);
}
