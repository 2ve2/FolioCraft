import type { Metadata } from "next";
import { LegalPage } from "../../../../features/legal/legal-page";

export const metadata: Metadata = { title: "Privacy notice — Ichnara" };

/** Mounts the bilingual privacy notice. */
export default function PrivacyPage() {
	return <LegalPage document="privacy" />;
}
