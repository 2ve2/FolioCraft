import type { Draft, Locale, Site } from "@ichnara/contracts";

export type Section = "content" | "appearance" | "settings" | "operations" | "account";
export type SaveState = "saved" | "saving" | "unsaved" | "failed";

export type DraftUpdate = (value: Draft | ((draft: Draft) => Draft)) => void;
export type EditorSectionProps = { draft: Draft; site: Site; locale: Locale; update: DraftUpdate };
