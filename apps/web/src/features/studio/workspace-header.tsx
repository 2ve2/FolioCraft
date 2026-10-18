import type { Locale } from "@ichnara/contracts";
import { Check, ChevronLeft, Circle, Globe2, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { copy } from "./copy";
import type { SaveState, Section } from "./types";

/** Shows current save feedback and the guarded publication action. */
export function WorkspaceHeader({
	locale,
	localeControl,
	section,
	saveState,
	busy,
	publish,
}: {
	locale: Locale;
	localeControl: ReactNode;
	section: Section;
	saveState: SaveState;
	busy: boolean;
	publish: () => Promise<void>;
}) {
	const t = copy[locale];
	return (
		<header className="studio-header">
			<div className="page-breadcrumb">
				<span>{t.studio}</span>
				<ChevronLeft size={14} />
				<b>{t[section]}</b>
			</div>
			<div className="header-actions">
				{localeControl}
				<span className={`save-status state-${saveState}`} role="status">
					{saveState === "saving" ? (
						<LoaderCircle size={13} className="spin" />
					) : saveState === "saved" ? (
						<Check size={13} />
					) : (
						<Circle size={9} />
					)}
					<span>{t[saveState]}</span>
				</span>
				<button
					type="button"
					className="primary small"
					aria-label={t.publish}
					disabled={busy}
					onClick={() => void publish()}
				>
					{busy ? <LoaderCircle size={16} className="spin" /> : <Globe2 size={16} />}
					<span>{busy ? t.working : t.publish}</span>
				</button>
			</div>
		</header>
	);
}
