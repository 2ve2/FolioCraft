import { LegalPage } from "../../../../features/legal/legal-page";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata({
	ar: "إشعار الخصوصية — إيكنارا",
	en: "Privacy notice — Ichnara",
});

/** Mounts the bilingual privacy notice. */
export default function PrivacyPage() {
	return <LegalPage document="privacy" />;
}
