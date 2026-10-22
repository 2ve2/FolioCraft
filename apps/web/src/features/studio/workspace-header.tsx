import type { Locale } from "@ichnara/contracts";
import { Check, ChevronLeft, Circle, Globe2, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonContent } from "../../components/ui/button-content";
import { copy } from "./copy";
import type { SaveState, Section } from "./types";

/** Shows current save feedback and the guarded publication action. */
export function WorkspaceHeader({
	locale,
	localeControl,
	section,
	saveState,
	busy,
	loading = false,
	publish,
}: {
	locale: Locale;
	localeControl: ReactNode;
	section: Section;
	saveState: SaveState;
	busy: boolean;
	loading?: boolean;
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
				{loading ? (
					<span className="save-status" aria-hidden="true">
						<span className="studio-placeholder studio-placeholder--save" />
					</span>
				) : (
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
				)}
				<button
					type="button"
					className="primary small"
					aria-label={t.publish}
					disabled={busy || loading}
					onClick={() => void publish()}
				>
					<ButtonContent loading={busy && !loading}>
						<Globe2 size={16} />
						<span className="publish-label">{t.publish}</span>
					</ButtonContent>
				</button>
			</div>
		</header>
	);
}
