import type { Locale } from "@ichnara/contracts";
import { brandArtwork } from "./brand-artwork";

/**
 * Renders the locale lockup with an accessible name. The word inherits the surrounding ink; the
 * emblem takes `--brand-emblem` (the brand indigo on light surfaces, the ink itself on dark ones).
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
					<g
						key={group.transform}
						transform={group.transform}
						fill={group.role === "emblem" ? "var(--brand-emblem, currentColor)" : undefined}
					>
						{group.paths.map((path) => (
							<path key={`${path.d}-${"transform" in path ? path.transform : ""}`} {...path} />
						))}
					</g>
				))}
			</svg>
		</span>
	);
}
