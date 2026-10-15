import type { Draft, Locale, Site } from "@folio/contracts";

export type Section = "content" | "appearance" | "settings" | "operations";
export type SaveState = "saved" | "saving" | "unsaved" | "failed";

export type DraftUpdate = (value: Draft | ((draft: Draft) => Draft)) => void;
export type EditorSectionProps = { draft: Draft; site: Site; locale: Locale; update: DraftUpdate };
