import { RecoveryScreen } from "../../../../features/auth/recovery-screen";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata(
	{ ar: "إعادة تعيين كلمة المرور — إيكنارا", en: "Reset password — Ichnara" },
	{ robots: { index: false, follow: false }, referrer: "no-referrer" },
);

/** Mounts the native account reset flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="reset" mode="reset" />;
}
