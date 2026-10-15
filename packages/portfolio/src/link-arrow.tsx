import type { Locale } from "@folio/contracts";

/** Gives text actions one 16px arrow, stable stroke and locale-aware direction. */
export function LinkArrow({ locale }: { locale: Locale }) {
	return (
		<svg
			className="link-arrow"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			style={{
				flexShrink: 0,
				display: "inline-block",
				verticalAlign: "middle",
				transform: locale === "ar" ? "scaleX(-1)" : undefined,
			}}
		>
			<path d="M7 17 17 7M7 7h10v10" />
		</svg>
	);
}
