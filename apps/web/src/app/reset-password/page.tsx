import { RecoveryScreen } from "../../features/auth/recovery-screen";

export const metadata = {
	title: "Reset password — Ichnara",
	robots: { index: false, follow: false },
	referrer: "no-referrer" as const,
};

/** Mounts the native account reset flow. */
export default function RecoveryPage() {
	return <RecoveryScreen key="reset" mode="reset" />;
}
