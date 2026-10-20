import { RecoveryScreen } from "../../../../features/auth/recovery-screen";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata(
	{ ar: "استعادة الحساب — إيكنارا", en: "Account recovery — Ichnara" },
	{ robots: { index: false, follow: false }, referrer: "no-referrer" },
);

/** Mounts the native account forgot flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="forgot" mode="forgot" />;
}
