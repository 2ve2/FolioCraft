import type { Locale } from "@ichnara/contracts";
import { brandArtwork } from "./brand-artwork";

/**
 * Renders the locale lockup with an accessible name. The word and the emblem's first band inherit
 * the surrounding ink; the second band takes `--brand-emblem` (indigo on light surfaces, a lighter
 * indigo on the dark footer).
 */
export function Brand({ locale = "en" }: { locale?: Locale }) {
	const artwork = brandArtwork[locale];
	return (
		<span className="brand">
			<svg
				width={artwork.width}
				height={artwork.height}
				viewBox={artwork.viewBox}
				fill="currentColor"
				role="img"
				aria-label={locale === "ar" ? "إيكنارا" : "Ichnara"}
				// Arabic descenders hang below the shared baseline row instead of enlarging the header.
				style={artwork.trim ? { marginBlockEnd: -artwork.trim } : undefined}
			>
				{artwork.groups.map((group) => (
					<g key={group.role} transform={group.transform}>
						{group.paths.map((path) => (
							<path
								key={path.d}
								d={path.d}
								fill={"tone" in path ? "var(--brand-emblem, currentColor)" : undefined}
							/>
						))}
					</g>
				))}
			</svg>
		</span>
	);
}
