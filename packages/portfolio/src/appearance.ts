import type { Draft } from "@ichnara/contracts";
import type { CSSProperties } from "react";

const themes = {
	light: {
		background: "#faf9fc",
		surface: "#ffffff",
		text: "#202033",
		muted: "#58586b",
		border: "#e2e0ea",
		soft: "#f0eef5",
	},
	dark: {
		background: "#15151e",
		surface: "#20202c",
		text: "#f7f5ff",
		muted: "#c0bccd",
		border: "#3b394a",
		soft: "#2a2838",
	},
	editorial: {
		background: "#f6f1e7",
		surface: "#fffcf6",
		text: "#302b25",
		muted: "#655c50",
		border: "#dcd3c3",
		soft: "#ede5d7",
	},
};
const accents = { violet: "#6d3dc0", blue: "#235db2", green: "#206e4c", rose: "#ad315f" };
const darkAccents = { violet: "#bb9cff", blue: "#91beff", green: "#7bd8ab", rose: "#ffa4c2" };
const fonts = {
	sans: '"Noto Sans Arabic Variable", Arial, sans-serif',
	serif: '"Noto Naskh Arabic Variable", Georgia, serif',
	mono: '"IBM Plex Mono", "Noto Sans Arabic Variable", monospace',
};
export const portfolioTextSizes = { small: "14px", medium: "15px", large: "17px" };
export const portfolioFontNames = {
	sans: "Noto Sans Arabic",
	serif: "Noto Naskh Arabic",
	mono: "IBM Plex Mono + Noto Sans Arabic",
};

/** Maps stable appearance keys to portfolio-only CSS tokens. */
export function getPortfolioStyle(appearance: Draft["appearance"]): CSSProperties {
	const palette = themes[appearance.theme];
	const accent = (appearance.theme === "dark" ? darkAccents : accents)[appearance.accent];
	return {
		"--folio-bg": palette.background,
		"--folio-surface": palette.surface,
		"--folio-text": palette.text,
		"--folio-muted": palette.muted,
		"--folio-border": palette.border,
		"--folio-soft": palette.soft,
		"--folio-accent": accent,
		fontFamily: fonts[appearance.font],
		fontSize: portfolioTextSizes[appearance.size],
	} as CSSProperties;
}
