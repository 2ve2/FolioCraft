import { LegalPage } from "../../../../features/legal/legal-page";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata({
	ar: "سياسة المحتوى — إيكنارا",
	en: "Content policy — Ichnara",
});

/** Mounts the bilingual content policy. */
export default function ContentPolicyPage() {
	return <LegalPage document="content-policy" />;
}
