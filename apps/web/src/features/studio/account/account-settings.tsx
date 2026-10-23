"use client";
import type { Locale } from "@ichnara/contracts";
import { isStaff } from "@ichnara/contracts/admin-policy";
import { Laptop, Smartphone } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { ButtonContent } from "../../../components/ui/button-content";
import { Field } from "../../../components/ui/field";
import { authClient } from "../../../lib/auth-client";
import { localeHref } from "../../../lib/locale";
import { forgetSignedIn } from "../../../lib/signed-in-hint";
import styles from "./account.module.css";
import { accountCopy } from "./account-copy";

type Copy = (typeof accountCopy)[Locale];
type AccountUser = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	role?: string | null;
};
type DeviceSession = {
	id: string;
	token: string;
	createdAt: Date;
	updatedAt: Date;
	expiresAt: Date;
	userAgent?: string | null;
};

/** Translates a Better Auth error code into page copy; unknown failures get the generic message. */
function failure(t: Copy, error: { code?: string } | null | undefined) {
	const code = error?.code as keyof Copy["errors"] | undefined;
	return (code && t.errors[code]) || t.errors.failed;
}

/** One settings card with a heading, short explanation and its own feedback line. */
function Card({
	title,
	hint,
	tone,
	children,
}: {
	title: string;
	hint?: ReactNode;
	tone?: "danger";
	children: ReactNode;
}) {
	return (
		<section className={styles.card} data-tone={tone}>
			<header>
				<h2>{title}</h2>
				{hint && <p>{hint}</p>}
			</header>
			{children}
		</section>
	);
}

/** Success or error line under a card's action; announced to assistive technology. */
function Feedback({ ok, error }: { ok?: string; error?: string }) {
	if (error)
		return (
			<p className={styles.error} role="alert">
				{error}
			</p>
		);
	if (ok)
		return (
			<p className={styles.ok} role="status">
				{ok}
			</p>
		);
	return null;
}

/**
 * A confirmation that must survive a remount: changing the password ends the old session and the
 * studio reloads under the new one, so the message is kept here and shown once on return.
 */
const pendingNotice = { message: "" };

/** Name shown in the studio; the server accepts only a trimmed name of 1 to 80 characters. */
function ProfileCard({ t, user }: { t: Copy; user: AccountUser }) {
	const [name, setName] = useState(user.name);
	// Follows a name saved elsewhere (another tab) without discarding unsaved typing here.
	const [savedName, setSavedName] = useState(user.name);
	if (user.name !== savedName) {
		setSavedName(user.name);
		if (name === savedName) setName(user.name);
	}
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ ok?: string; error?: string }>({});
	const clean = name.trim();
	async function save(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setResult({});
		const { error } = await authClient.updateUser({ name: clean }).catch(() => ({
			error: { code: "failed" },
		}));
		setBusy(false);
		setResult(error ? { error: failure(t, error) } : { ok: t.saved });
	}
	return (
		<Card title={t.profile} hint={t.profileHint}>
			<form className={styles.form} onSubmit={save}>
				<Field label={t.name}>
					<input
						value={name}
						maxLength={80}
						autoComplete="name"
						dir="auto"
						onChange={(event) => setName(event.target.value)}
					/>
				</Field>
				<div className={styles.actions}>
					<button
						type="submit"
						className="primary"
						disabled={busy || !clean || clean === user.name}
					>
						<ButtonContent loading={busy}>{t.save}</ButtonContent>
					</button>
				</div>
				<Feedback {...result} />
			</form>
		</Card>
	);
}

/** Starts Better Auth's email change: approval from the current address first when it is verified. */
function EmailCard({ t, user, locale }: { t: Copy; user: AccountUser; locale: Locale }) {
	const [email, setEmail] = useState("");
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ ok?: string; error?: string }>({});
	async function submit(event: FormEvent) {
		event.preventDefault();
		const next = email.trim().toLowerCase();
		if (next === user.email.toLowerCase()) return setResult({ error: t.sameEmail });
		setBusy(true);
		setResult({});
		const { error } = await authClient
			.changeEmail({
				newEmail: next,
				callbackURL: `${window.location.origin}${localeHref(locale, "/studio")}`,
			})
			.catch(() => ({ error: { code: "failed" } }));
		setBusy(false);
		if (error) return setResult({ error: failure(t, error) });
		setEmail("");
		setResult({
			ok: user.emailVerified
				? t.emailSentVerified.replace("{email}", user.email)
				: t.emailSentUnverified,
		});
	}
	return (
		<Card title={t.email} hint={user.emailVerified ? t.emailHintVerified : t.emailHintUnverified}>
			<div className={styles.current}>
				<bdi dir="ltr">{user.email}</bdi>
				<span className={styles.badge} data-tone={user.emailVerified ? "success" : "warning"}>
					{user.emailVerified ? t.verified : t.unverified}
				</span>
			</div>
			<form className={styles.form} onSubmit={submit}>
				<Field label={t.newEmail}>
					<input
						type="email"
						required
						maxLength={254}
						autoComplete="email"
						dir="ltr"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</Field>
				<div className={styles.actions}>
					<button type="submit" className="secondary" disabled={busy || !email.trim()}>
						<ButtonContent loading={busy}>{t.changeEmail}</ButtonContent>
					</button>
				</div>
				<Feedback {...result} />
			</form>
		</Card>
	);
}

/** Changes the password with the current one; other sessions end unless the user unticks it. */
function PasswordCard({ t, locale }: { t: Copy; locale: Locale }) {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [repeat, setRepeat] = useState("");
	const [others, setOthers] = useState(true);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ ok?: string; error?: string }>({});
	async function submit(event: FormEvent) {
		event.preventDefault();
		if (next.length < 10) return setResult({ error: t.tooShort });
		if (next !== repeat) return setResult({ error: t.mismatch });
		setBusy(true);
		setResult({});
		const { error } = await authClient
			.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: others })
			.catch(() => ({ error: { code: "failed" } }));
		setBusy(false);
		setCurrent("");
		if (error) return setResult({ error: failure(t, error) });
		setNext("");
		setRepeat("");
		// Signing out other devices replaces this session too, which reloads the studio.
		if (others) pendingNotice.message = t.passwordChanged;
		setResult({ ok: t.passwordChanged });
	}
	return (
		<Card title={t.password} hint={t.passwordHint}>
			<form className={styles.form} onSubmit={submit}>
				<Field label={t.currentPassword}>
					<input
						type="password"
						required
						autoComplete="current-password"
						maxLength={1024}
						value={current}
						onChange={(event) => setCurrent(event.target.value)}
					/>
				</Field>
				<div className={styles.pair}>
					<Field label={t.newPassword}>
						<input
							type="password"
							required
							minLength={10}
							maxLength={128}
							autoComplete="new-password"
							value={next}
							onChange={(event) => setNext(event.target.value)}
						/>
					</Field>
					<Field label={t.confirmPassword}>
						<input
							type="password"
							required
							minLength={10}
							maxLength={128}
							autoComplete="new-password"
							value={repeat}
							onChange={(event) => setRepeat(event.target.value)}
						/>
					</Field>
				</div>
				<label className={styles.check}>
					<input
						type="checkbox"
						checked={others}
						onChange={(event) => setOthers(event.target.checked)}
					/>
					{t.signOutOthers}
				</label>
				<div className={styles.actions}>
					<button type="submit" className="primary" disabled={busy || !current || !next || !repeat}>
						<ButtonContent loading={busy}>{t.changePassword}</ButtonContent>
					</button>
					<Link className="text-button" href={localeHref(locale, "/forgot-password")}>
						{t.forgot}
					</Link>
				</div>
				<Feedback {...result} />
			</form>
		</Card>
	);
}

/** A readable device label from the stored user agent, such as "Chrome on macOS". */
function deviceName(t: Copy, agent?: string | null) {
	if (!agent) return { label: t.unknownDevice, mobile: false };
	const browser = /Edg\//.test(agent)
		? "Edge"
		: /OPR\//.test(agent)
			? "Opera"
			: /Firefox\//.test(agent)
				? "Firefox"
				: /Chrome\//.test(agent)
					? "Chrome"
					: /Safari\//.test(agent)
						? "Safari"
						: null;
	const system = /iPhone|iPad/.test(agent)
		? "iOS"
		: /Android/.test(agent)
			? "Android"
			: /Mac OS X/.test(agent)
				? "macOS"
				: /Windows/.test(agent)
					? "Windows"
					: /Linux/.test(agent)
						? "Linux"
						: null;
	const label = [browser, system].filter(Boolean).join(` ${t.on} `) || t.unknownDevice;
	return { label, mobile: /Mobile|iPhone|Android/.test(agent) };
}

/** Lists this account's active sessions through Better Auth and signs out the chosen ones. */
function DevicesCard({ t, locale, currentId }: { t: Copy; locale: Locale; currentId: string }) {
	const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<{ ok?: string; error?: string }>({});
	const load = useCallback(async () => {
		setLoadFailed(false);
		const { data, error } = await authClient.listSessions().catch(() => ({
			data: null,
			error: { code: "failed" },
		}));
		if (error || !data) return setLoadFailed(true);
		setSessions(
			(data as DeviceSession[])
				.filter((row) => new Date(row.expiresAt).getTime() > Date.now())
				.sort((a, b) => (a.id === currentId ? -1 : b.id === currentId ? 1 : 0)),
		);
	}, [currentId]);
	useEffect(() => {
		void load();
	}, [load]);
	async function run(operation: () => Promise<{ error?: { code?: string } | null }>, ok?: string) {
		setBusy(true);
		setResult({});
		const { error } = await operation().catch(() => ({ error: { code: "failed" } }));
		setBusy(false);
		setResult(error ? { error: failure(t, error) } : { ok });
		await load();
	}
	const others = sessions?.filter((row) => row.id !== currentId) ?? [];
	const date = (value: Date) =>
		new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
	return (
		<Card title={t.devices} hint={t.devicesHint}>
			{loadFailed ? (
				<div className={styles.actions}>
					<p className={styles.error} role="alert">
						{t.errors.failed}
					</p>
					<button type="button" className="secondary" onClick={() => void load()}>
						{t.retry}
					</button>
				</div>
			) : !sessions ? (
				<p className="muted" role="status">
					{t.loading}
				</p>
			) : (
				<ul className={styles.devices} aria-busy={busy}>
					{sessions.map((row) => {
						const device = deviceName(t, row.userAgent);
						const Icon = device.mobile ? Smartphone : Laptop;
						return (
							<li key={row.id}>
								<span className={styles.deviceIcon} aria-hidden="true">
									<Icon size={18} />
								</span>
								<span className={styles.deviceText}>
									<b>
										{device.label}
										{row.id === currentId && (
											<span className={styles.badge} data-tone="success">
												{t.thisDevice}
											</span>
										)}
									</b>
									<small>
										{t.signedIn}: {date(row.createdAt)} · {t.lastActive}: {date(row.updatedAt)}
									</small>
								</span>
								{row.id !== currentId && (
									<button
										type="button"
										className="text-button"
										disabled={busy}
										onClick={() => void run(() => authClient.revokeSession({ token: row.token }))}
									>
										{t.signOut}
									</button>
								)}
							</li>
						);
					})}
				</ul>
			)}
			{others.length > 0 && (
				<div className={styles.actions}>
					<button
						type="button"
						className="secondary"
						disabled={busy}
						onClick={() => void run(() => authClient.revokeOtherSessions(), t.signedOutOthers)}
					>
						{t.signOutAll}
					</button>
				</div>
			)}
			<Feedback {...result} />
		</Card>
	);
}

/** Password-confirmed permanent deletion; staff accounts are refused here and by the server. */
function DeleteCard({
	t,
	user,
	locale,
	exportDraft,
}: {
	t: Copy;
	user: AccountUser;
	locale: Locale;
	exportDraft: () => void;
}) {
	const [password, setPassword] = useState("");
	const [word, setWord] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		const result = await authClient
			.deleteUser({ password })
			.catch(() => ({ error: { code: "failed" } }));
		setPassword("");
		if (result.error) {
			setBusy(false);
			return setError(failure(t, result.error));
		}
		forgetSignedIn();
		window.location.assign(localeHref(locale, "/"));
	}
	return (
		<Card title={t.danger} hint={t.dangerHint} tone="danger">
			{isStaff(user.role) ? (
				<p className="muted">{t.staffNote}</p>
			) : (
				<form className={styles.form} onSubmit={submit}>
					<div className={styles.actions}>
						<button type="button" className="secondary" onClick={exportDraft}>
							{t.exportFirst}
						</button>
					</div>
					<div className={styles.pair}>
						<Field label={t.currentPassword}>
							<input
								type="password"
								required
								autoComplete="current-password"
								maxLength={1024}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</Field>
						<Field label={t.confirmLabel}>
							<input
								required
								autoComplete="off"
								dir="auto"
								value={word}
								onChange={(event) => setWord(event.target.value)}
							/>
						</Field>
					</div>
					<div className={styles.actions}>
						<button
							type="submit"
							className="danger-button"
							disabled={busy || !password || word.trim() !== t.confirmWord}
						>
							<ButtonContent loading={busy}>{t.deleteButton}</ButtonContent>
						</button>
					</div>
					<Feedback error={error} />
				</form>
			)}
		</Card>
	);
}

/** The studio's account page: profile, sign-in email, password, devices and deletion. */
export function AccountSettings({
	locale,
	user,
	sessionId,
	exportDraft,
}: {
	locale: Locale;
	user: AccountUser;
	sessionId: string;
	exportDraft: () => void;
}) {
	const t = accountCopy[locale];
	const [notice] = useState(() => {
		const message = pendingNotice.message;
		pendingNotice.message = "";
		return message;
	});
	return (
		<div className={styles.page}>
			{notice && (
				<p className={styles.ok} role="status">
					{notice}
				</p>
			)}
			<div className="section-heading">
				<span className="eyebrow">05 / {t.title}</span>
				<h1>{t.title}</h1>
				<p>{t.intro}</p>
			</div>
			<ProfileCard t={t} user={user} />
			<EmailCard t={t} user={user} locale={locale} />
			<PasswordCard t={t} locale={locale} />
			<DevicesCard t={t} locale={locale} currentId={sessionId} />
			<DeleteCard t={t} user={user} locale={locale} exportDraft={exportDraft} />
		</div>
	);
}
