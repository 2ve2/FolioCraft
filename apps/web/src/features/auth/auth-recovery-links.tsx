import type { Locale } from "@ichnara/contracts";
import Link from "next/link";
import { localeHref } from "../../lib/locale";

/** Offers password recovery only at sign-in and verification resend only after a verification gate. */
export function AuthRecoveryLinks({
	locale,
	mode,
	verificationRequired,
}: {
	locale: Locale;
	mode: "login" | "signup";
	verificationRequired: boolean;
}) {
	return (
		<>
			{mode === "login" && (
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
