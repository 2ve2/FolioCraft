import type { Draft, Locale } from "@ichnara/contracts";

export type ContentEditorProps = {
	draft: Draft;
	locale: Locale;
	siteId: string;
	update: (change: (draft: Draft) => Draft) => void;
};
