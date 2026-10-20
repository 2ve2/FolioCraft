import { RecoveryScreen } from "../../../../features/auth/recovery-screen";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata(
	{ ar: "تأكيد البريد الإلكتروني — إيكنارا", en: "Email verification — Ichnara" },
	{ robots: { index: false, follow: false }, referrer: "no-referrer" },
);

/** Mounts the native account verify flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="verify" mode="verify" />;
}
