"use client";
import { LanguageSwitch } from "../../components/ui/language-switch";
import { authClient } from "../../lib/auth-client";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { WelcomeScreen } from "./welcome-screen";

/** Keeps the public product introduction available without mounting the private workspace. */
export function LandingPage() {
	const [locale, setLocale] = useInterfaceLocale();
	const { data: session } = authClient.useSession();
	return (
		<WelcomeScreen
			locale={locale}
			localeControl={<LanguageSwitch locale={locale} onChange={setLocale} />}
			authenticated={Boolean(session?.user)}
		/>
	);
}
