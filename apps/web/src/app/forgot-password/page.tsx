import { RecoveryScreen } from "../../features/auth/recovery-screen";

export const metadata = {
	title: "Account recovery — Ichnara",
	robots: { index: false, follow: false },
	referrer: "no-referrer" as const,
};

/** Mounts the native account forgot flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="forgot" mode="forgot" />;
}
