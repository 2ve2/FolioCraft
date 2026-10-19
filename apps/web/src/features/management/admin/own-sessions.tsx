"use client";
import type { Locale } from "@ichnara/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { adminSecurityCopy } from "./admin-security-copy";

type OwnSession = { id: string; token: string; createdAt: Date; expiresAt: Date };
/** Uses Better Auth's native own-session protocol; no management API or other-account ID. */
export function OwnSessions({ locale, currentId }: { locale: Locale; currentId: string }) {
	const t = adminSecurityCopy[locale];
	const [sessions, setSessions] = useState<OwnSession[] | null>(null),
		[failed, setFailed] = useState(false),
		[busy, setBusy] = useState(false),
		[version, setVersion] = useState(0);
	useEffect(() => {
		let active = true;
		void version;
		setSessions(null);
		setFailed(false);
		void authClient
			.listSessions()
			.then((result) => {
				if (!active) return;
				if (result.error || !result.data) {
					setFailed(true);
					return;
				}
				setSessions(result.data.filter((row) => new Date(row.expiresAt).getTime() > Date.now()));
			})
			.catch(() => {
				if (active) setFailed(true);
			});
		return () => {
			active = false;
		};
	}, [version]);
	async function revoke(row: OwnSession) {
		if (busy || row.id === currentId) return;
		setBusy(true);
		setFailed(false);
		try {
			const result = await authClient.revokeSession({ token: row.token });
			if (result.error) throw new Error();
			setVersion((v) => v + 1);
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section aria-busy={busy}>
			<h2>{t.sessions}</h2>
			<p>{t.sessionsIntro}</p>
			{failed ? (
				<>
					<p role="alert">{t.failure}</p>
					<button type="button" onClick={() => setVersion((v) => v + 1)}>
						{t.retry}
					</button>
				</>
			) : !sessions ? (
				<p role="status">{t.loading}</p>
			) : (
				sessions.map((row) => (
					<article key={row.id}>
						<p>
							<bdi>{row.id}</bdi>
						</p>
						<p>
							{t.sessionCreated}: <time>{new Date(row.createdAt).toLocaleString(locale)}</time>
						</p>
						<p>
							{t.sessionExpires}: <time>{new Date(row.expiresAt).toLocaleString(locale)}</time>
						</p>
						{row.id === currentId ? (
							<p>{t.currentSession}</p>
						) : (
							<button type="button" disabled={busy} onClick={() => void revoke(row)}>
								{t.revokeOther}
							</button>
						)}
					</article>
				))
			)}
			<Link href={`/admin?lang=${locale}`}>{t.console}</Link>
		</section>
	);
}
