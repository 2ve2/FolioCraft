import { LegalPage } from "../../../../features/legal/legal-page";
import { localizedMetadata } from "../../../../lib/locale-metadata";

export const generateMetadata = localizedMetadata({
	ar: "شروط الاستخدام — إيكنارا",
	en: "Terms of use — Ichnara",
});

/** Mounts the bilingual terms of use. */
export default function TermsPage() {
	return <LegalPage document="terms" />;
}
