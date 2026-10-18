"use client";
import {
	ArrowUpRight,
	Globe2,
	LayoutDashboard,
	LogOut,
	ScrollText,
	ShieldCheck,
	ShieldX,
	UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Brand } from "../../../components/ui/brand";
import { LanguageSwitch } from "../../../components/ui/language-switch";
import { TooltipButton } from "../../../components/ui/tooltip-button";
import { authClient } from "../../../lib/auth-client";
import { useInterfaceLocale } from "../../../lib/use-interface-locale";
import { LoadingScreen } from "../../studio/loading-screen";
import ui from "./admin.module.css";
import { AdminContext } from "./admin-context";
import { adminCopy } from "./admin-copy";
import styles from "./admin-shell.module.css";

const navigation = [
	{ key: "overview", path: "/admin", icon: LayoutDashboard },
	{ key: "sites", path: "/admin/sites", icon: Globe2 },
	{ key: "users", path: "/admin/accounts", icon: UsersRound },
	{ key: "audit", path: "/admin/activity", icon: ScrollText },
] as const;

/** Gates administration children and supplies an independent responsive navigation shell. */
export function AdminShell({ children }: { children: ReactNode }) {
	const [locale, setLocale, localeReady] = useInterfaceLocale();
	const t = adminCopy[locale];
	const pathname = usePathname();
	const router = useRouter();
	const { data: session, isPending, error, refetch } = authClient.useSession();
	const [signingOut, setSigningOut] = useState(false);
	const [signoutError, setSignoutError] = useState(false);
	const admin = session?.user.role?.split(",").includes("admin");

	/** Uses the native sign-out operation before returning to the public website. */
	async function logout() {
		setSigningOut(true);
		setSignoutError(false);
		try {
			const result = await authClient.signOut();
			if (result.error) throw new Error("Signout failed");
			router.replace(`/?lang=${locale}`);
		} catch {
			setSignoutError(true);
		} finally {
			setSigningOut(false);
		}
	}

	if (isPending || !localeReady)
		return (
			<LoadingScreen
				locale={locale}
				message={
					locale === "ar" ? "جارٍ التحقق من صلاحيات الإدارة…" : "Checking administrator access…"
				}
			/>
		);
	if (error || !admin || !session?.user)
		return (
			<div className={styles.gate} dir={locale === "ar" ? "rtl" : "ltr"}>
				<header>
					<Link href={`/?lang=${locale}`}>
						<Brand locale={locale} />
					</Link>
					<LanguageSwitch
						locale={locale}
						onChange={setLocale}
						label={locale === "ar" ? "لغة الواجهة" : "Interface language"}
					/>
				</header>
				<main className={styles.gateCard}>
					<ShieldX size={32} aria-hidden="true" />
					<h1>{error ? t.sessionError : t.denied}</h1>
					<p>{session?.user ? t.deniedDescription : t.signInDescription}</p>
					<div className={ui.actions}>
						{error ? (
							<button type="button" className={ui.primary} onClick={() => void refetch()}>
								{t.retry}
							</button>
						) : !session?.user ? (
							<Link className={ui.primary} href={`/login?lang=${locale}&from=admin`}>
								{t.signIn}
							</Link>
						) : (
							<Link className={ui.primary} href={`/studio?lang=${locale}`}>
								{t.studio}
							</Link>
						)}
						<Link className={ui.secondary} href={`/?lang=${locale}`}>
							{t.home}
						</Link>
					</div>
				</main>
			</div>
		);

	const active = navigation.find((item) => item.path === pathname) || navigation[0];
	return (
		<AdminContext.Provider value={{ locale, setLocale, user: session.user }}>
			<div className={styles.shell} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
				<a className={styles.skip} href="#admin-main">
					{t.skip}
				</a>
				<aside className={styles.sidebar}>
					<Link className={styles.brand} href={`/admin?lang=${locale}`}>
						<Brand locale={locale} />
					</Link>
					<span className={styles.navLabel}>{t.label}</span>
					<nav aria-label={t.platform} className={styles.nav}>
						{navigation.map(({ key, path, icon: Icon }) => (
							<Link
								key={key}
								href={`${path}?lang=${locale}`}
								aria-current={pathname === path ? "page" : undefined}
								className={styles.navLink}
							>
								<Icon size={19} aria-hidden="true" />
								<span>{t[key]}</span>
								{pathname === path && <i />}
							</Link>
						))}
					</nav>
					<div className={styles.sidebarBottom}>
						<Link className={styles.studioLink} href={`/studio?lang=${locale}`}>
							<span>{t.studio}</span>
							<ArrowUpRight size={17} aria-hidden="true" />
						</Link>
						<div className={styles.adminIdentity}>
							<span className={styles.adminAvatar}>
								<ShieldCheck size={20} aria-hidden="true" />
							</span>
							<div>
								<strong dir="auto">{session.user.name}</strong>
								<small>{t.administrator}</small>
							</div>
							<TooltipButton
								className={ui.iconButton}
								hint={t.logout}
								aria-label={t.logout}
								disabled={signingOut}
								onClick={() => void logout()}
							>
								<LogOut size={17} />
							</TooltipButton>
						</div>
						{signoutError && (
							<p className={ui.error} role="alert">
								{t.sessionError}
							</p>
						)}
					</div>
				</aside>
				<div className={styles.workspace}>
					<header className={styles.topbar}>
						<div>
							<ShieldCheck size={16} aria-hidden="true" />
							<span>{t.platform}</span>
							<span className={styles.breadcrumb}>/</span>
							<strong>{t[active.key]}</strong>
						</div>
						<div className={styles.topbarTools}>
							<LanguageSwitch
								locale={locale}
								onChange={setLocale}
								label={locale === "ar" ? "لغة الواجهة" : "Interface language"}
							/>
							<div className={styles.mobileActions}>
								<Link
									className={ui.iconButton}
									href={`/studio?lang=${locale}`}
									aria-label={t.studio}
								>
									<ArrowUpRight size={18} />
								</Link>
								<TooltipButton
									className={ui.iconButton}
									hint={t.logout}
									aria-label={t.logout}
									disabled={signingOut}
									onClick={() => void logout()}
								>
									<LogOut size={17} />
								</TooltipButton>
							</div>
						</div>
					</header>
					<main className={styles.main} id="admin-main" tabIndex={-1}>
						{children}
					</main>
				</div>
			</div>
		</AdminContext.Provider>
	);
}
