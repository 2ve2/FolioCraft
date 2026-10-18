import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { session as sessions, twoFactor } from "../../db/schema/auth";

type MfaSession = {
	user: { id: string; twoFactorEnabled?: boolean | null };
	session: { id: string };
};

/** Binds session proof to the exact enrolled factor without storing the factor's secret in sessions. */
export function totpFingerprint(factor: { id: string; secret: string }) {
	return createHash("sha256").update(`admin-totp-v1\0${factor.id}\0${factor.secret}`).digest("hex");
}

/** Rejects duplicate/unverified enrollment state instead of guessing which factor is authoritative. */
export async function enrolledFactor(userId: string) {
	const rows = await db
		.select({ id: twoFactor.id, secret: twoFactor.secret, verified: twoFactor.verified })
		.from(twoFactor)
		.where(eq(twoFactor.userId, userId))
		.limit(2);
	return rows.length === 1 && rows[0].verified === true ? rows[0] : null;
}

/** Requires proof on this database session, not just an account-wide enrollment flag or session age. */
export async function hasTotpSession(actor: MfaSession): Promise<boolean> {
	if (!actor.user.twoFactorEnabled) return false;
	const [stored] = await db
		.select({ proof: sessions.adminTotpFactor, expiresAt: sessions.expiresAt })
		.from(sessions)
		.where(and(eq(sessions.id, actor.session.id), eq(sessions.userId, actor.user.id)))
		.limit(1);
	if (!stored?.proof || stored.expiresAt <= new Date()) return false;
	const factor = await enrolledFactor(actor.user.id);
	return Boolean(factor && stored.proof === totpFingerprint(factor));
}
