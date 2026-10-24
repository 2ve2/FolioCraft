import type { Locale } from "@ichnara/contracts";
import Link from "next/link";
import { localeHref } from "../../lib/locale";

/**
 * Offers password recovery at sign-in or after a sign-up refused a registered address, and
 * verification resend only after a verification gate.
 */
export function AuthRecoveryLinks({
	locale,
	mode,
	verificationRequired,
	emailTaken = false,
}: {
	locale: Locale;
	mode: "login" | "signup";
	verificationRequired: boolean;
	emailTaken?: boolean;
}) {
	return (
		<>
			{(mode === "login" || emailTaken) && (
				<Link className="text-button auth-switch" href={localeHref(locale, "/forgot-password")}>
					{locale === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
				</Link>
			)}
			{verificationRequired && (
				<Link className="text-button auth-switch" href={localeHref(locale, "/verify-email")}>
					{locale === "ar" ? "إعادة إرسال رسالة التحقق" : "Resend verification email"}
				</Link>
			)}
		</>
	);
}
