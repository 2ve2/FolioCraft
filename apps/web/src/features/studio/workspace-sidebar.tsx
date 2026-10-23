import type { Locale } from "@ichnara/contracts";
import { isStaff } from "@ichnara/contracts/admin-policy";
import { FileText, LogOut, Menu, Palette, Settings2, ShieldCheck, X } from "lucide-react";
import { Brand } from "../../components/ui/brand";
import { TooltipButton } from "../../components/ui/tooltip-button";
import { useDrawer } from "../../components/ui/use-drawer";
import { copy } from "./copy";
import type { Section } from "./types";

/** Matches the stylesheet breakpoint where the sidebar becomes a top bar with a menu drawer. */
const DRAWER_BREAKPOINT = 970;

/** Renders workspace navigation and the actual account sign-out action. */
export function WorkspaceSidebar({
	locale,
	user,
	section,
	setSection,
	setMobileTab,
	busy,
	logout,
	openAdministration,
}: {
	locale: Locale;
	user: { name: string; email: string; role?: string | null } | null;
	section: Section;
	setSection: (section: Section) => void;
	setMobileTab: (tab: "edit" | "preview") => void;
	busy: boolean;
	logout: () => Promise<void>;
	openAdministration: () => Promise<void>;
}) {
	const t = copy[locale];
	const drawer = useDrawer(DRAWER_BREAKPOINT);
	return (
		<aside className="sidebar" data-open={drawer.open || undefined}>
			<div className="sidebar-bar">
				<Brand locale={locale} />
				<button
					ref={drawer.toggleRef}
					type="button"
					className="menu-toggle icon-button"
					aria-label={t.openMenu}
					aria-expanded={drawer.open}
					aria-controls="studio-menu"
					onClick={() => drawer.setOpen(true)}
				>
					<Menu size={22} aria-hidden="true" />
				</button>
			</div>
			<button
				type="button"
				className="drawer-backdrop"
				tabIndex={-1}
				aria-hidden="true"
				onClick={() => drawer.close()}
			/>
			<div id="studio-menu" ref={drawer.panelRef} className="sidebar-drawer">
				<div className="drawer-head">
					<Brand locale={locale} />
					<button
						type="button"
						className="icon-button"
						aria-label={t.closeMenu}
						onClick={() => drawer.close()}
					>
						<X size={20} aria-hidden="true" />
					</button>
				</div>
				<div className="workspace-label">{t.workspace}</div>
				<nav aria-label={t.workspace}>
					{(
						[
							{ key: "content", icon: FileText },
							{ key: "appearance", icon: Palette },
							{ key: "operations", icon: FileText },

							{ key: "settings", icon: Settings2 },
						] as const
					).map(({ key, icon: Icon }) => (
						<button
							type="button"
							key={key}
							className={section === key ? "nav-item active" : "nav-item"}
							disabled={busy}
							aria-current={section === key ? "page" : undefined}
							onClick={() => {
								setSection(key);
								setMobileTab("edit");
								drawer.close();
							}}
						>
							<Icon size={18} />
							{t[key]}
							{section === key && <span className="nav-dot" />}
						</button>
					))}
					{isStaff(user?.role) && (
						<button
							type="button"
							className="nav-item"
							disabled={busy}
							onClick={() => void openAdministration()}
						>
							<ShieldCheck size={18} />
							{t.admin}
						</button>
					)}
				</nav>
				<div className="sidebar-bottom">
					<div className="sidebar-note">
						<span className="tiny-dot" />
						<p>{t.privacy}</p>
					</div>
					<div className="account">
						<span className="avatar">{user?.name.slice(0, 1)}</span>
						<span>
							{user ? (
								<>
									<b>{user.name}</b>
									<small dir="ltr">{user.email}</small>
								</>
							) : (
								<span
									className="studio-placeholder studio-placeholder--account"
									aria-hidden="true"
								/>
							)}
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
			</div>
		</aside>
	);
}
