import type { Metadata } from "next";
import { LegalPage } from "../../../features/legal/legal-page";

export const metadata: Metadata = { title: "Terms of use — Ichnara" };

/** Mounts the bilingual terms of use. */
export default function TermsPage() {
	return <LegalPage document="terms" />;
}
