import { RecoveryScreen } from "../../features/auth/recovery-screen";

export const metadata = {
	title: "Email verification — Ichnara",
	robots: { index: false, follow: false },
	referrer: "no-referrer" as const,
};

/** Mounts the native account verify flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="verify" mode="verify" />;
}
