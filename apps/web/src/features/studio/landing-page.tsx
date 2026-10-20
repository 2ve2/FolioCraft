"use client";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { PublicNotices } from "../../components/ui/public-notices";
import { authClient } from "../../lib/auth-client";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { WelcomeScreen } from "./welcome-screen";

/** Keeps the public product introduction available without mounting the private workspace. */
export function LandingPage() {
	const [locale, setLocale] = useInterfaceLocale();
	const { data: session } = authClient.useSession();
	return (
		<>
			<PublicNotices locale={locale} />
			<WelcomeScreen
				locale={locale}
				localeControl={<LanguageSwitch locale={locale} onChange={setLocale} />}
				authenticated={Boolean(session?.user)}
			/>
		</>
	);
}
