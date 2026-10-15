import type { Locale } from "@folio/contracts";
import { FileText, LogOut, Palette, Settings2 } from "lucide-react";
import { Brand } from "../../components/ui/brand";
import { TooltipButton } from "../../components/ui/tooltip-button";
import { copy } from "./copy";
import type { Section } from "./types";

/** Renders workspace navigation and the actual account sign-out action. */
export function WorkspaceSidebar({
	locale,
	user,
	section,
	setSection,
	setMobileTab,
	busy,
	logout,
}: {
	locale: Locale;
	user: { name: string; email: string; role?: string | null };
	section: Section;
	setSection: (section: Section) => void;
	setMobileTab: (tab: "edit" | "preview") => void;
	busy: boolean;
	logout: () => Promise<void>;
}) {
	const t = copy[locale];
	return (
		<aside className="sidebar">
			<Brand />
			<TooltipButton
				type="button"
				className="mobile-logout icon-button"
				aria-label={t.logout}
				hint={t.logout}
				onClick={() => void logout()}
				disabled={busy}
			>
				<LogOut size={18} />
			</TooltipButton>
			<div className="workspace-label">{t.workspace}</div>
			<nav aria-label={t.workspace}>
				{(
					[
						{ key: "content", icon: FileText },
						{ key: "appearance", icon: Palette },
						{ key: "operations", icon: FileText },
						...(user.role?.split(",").includes("admin")
							? [{ key: "admin" as const, icon: Settings2 }]
							: []),
						{ key: "settings", icon: Settings2 },
					] as const
				).map(({ key, icon: Icon }) => (
					<button
						type="button"
						key={key}
						className={section === key ? "nav-item active" : "nav-item"}
						disabled={busy}
						onClick={() => {
							setSection(key);
							setMobileTab("edit");
						}}
					>
						<Icon size={18} />
						{t[key]}
						{section === key && <span className="nav-dot" />}
					</button>
				))}
			</nav>
			<div className="sidebar-bottom">
				<div className="sidebar-note">
					<span className="tiny-dot" />
					<p>{t.privacy}</p>
				</div>
				<div className="account">
					<span className="avatar">{user.name.slice(0, 1)}</span>
					<span>
						<b>{user.name}</b>
						<small dir="ltr">{user.email}</small>
					</span>
					<TooltipButton
						type="button"
						className="icon-button"
						aria-label={t.logout}
						hint={t.logout}
						onClick={() => void logout()}
						disabled={busy}
					>
						<LogOut size={17} />
					</TooltipButton>
				</div>
			</div>
		</aside>
	);
}
