import type { Metadata } from "next";
import { LegalPage } from "../../../features/legal/legal-page";

export const metadata: Metadata = { title: "Content policy — Ichnara" };

/** Mounts the bilingual content policy. */
export default function ContentPolicyPage() {
	return <LegalPage document="content-policy" />;
}
