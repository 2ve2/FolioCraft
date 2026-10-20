import type { Locale } from "@ichnara/contracts";

export type AuthMailKind = "verify" | "reset";
type MailContent = { subject: string; text: string; html: string };

/** Escapes user-facing values before embedding them in an authentication email. */
const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
	);

/**
 * Reads the interface language the web app placed in the native link's callback URL
 * (`?lang=ar|en`). Anything missing or unexpected falls back to English.
 */
export function mailLocale(url: string): Locale {
	try {
		const callback = new URL(url).searchParams.get("callbackURL");
		return callback && new URL(callback).searchParams.get("lang") === "ar" ? "ar" : "en";
	} catch {
		return "en";
	}
}

const copy = {
	ar: {
		brand: "إيكنارا",
		greeting: (name: string) => `مرحبًا ${name}،`,
		verify: {
			subject: "تأكيد بريدك الإلكتروني — إيكنارا",
			intro: "اضغط الزر لتأكيد بريدك الإلكتروني وتفعيل حسابك.",
			action: "تأكيد البريد الإلكتروني",
		},
		reset: {
			subject: "إعادة تعيين كلمة المرور — إيكنارا",
			intro: "وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر لاختيار كلمة مرور جديدة.",
			action: "إعادة تعيين كلمة المرور",
		},
		fallback: "إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:",
		ignore: "إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن يتغير شيء في حسابك.",
	},
	en: {
		brand: "Ichnara",
		greeting: (name: string) => `Hi ${name},`,
		verify: {
			subject: "Verify your email — Ichnara",
			intro: "Use the button below to verify your email address and activate your account.",
			action: "Verify email",
		},
		reset: {
			subject: "Reset your password — Ichnara",
			intro:
				"We received a request to reset your account password. Use the button below to choose a new one.",
			action: "Reset password",
		},
		fallback: "If the button does not work, copy this link into your browser:",
		ignore: "If you did not request this, ignore this message and nothing will change.",
	},
} as const;

/** Builds a single-language authentication email with matching text and accessible HTML parts. */
export function authMailContent(
	kind: AuthMailKind,
	locale: Locale,
	name: string,
	url: string,
): MailContent {
	const t = copy[locale];
	const message = t[kind];
	const dir = locale === "ar" ? "rtl" : "ltr";
	const align = locale === "ar" ? "right" : "left";
	const link = escapeHtml(url);
	const text = [
		t.greeting(name),
		"",
		message.intro,
		"",
		`${message.action}: ${url}`,
		"",
		t.ignore,
		"",
		t.brand,
	].join("\n");
	const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(message.subject)}</title></head>
<body style="margin:0;padding:24px;background:#f7f5fb;font-family:Arial,'Segoe UI',Tahoma,sans-serif;color:#2a2438;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ebe6f2;border-radius:12px;padding:32px;text-align:${align};" dir="${dir}">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#3f46c8;">${t.brand}</p>
<p style="margin:0 0 12px;font-size:16px;">${escapeHtml(t.greeting(name))}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.7;">${message.intro}</p>
<p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#3f46c8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">${message.action}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#6b6280;">${t.fallback}</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all;" dir="ltr"><a href="${link}" style="color:#3f46c8;">${link}</a></p>
<p style="margin:0;font-size:13px;color:#6b6280;">${t.ignore}</p>
</div>
</body>
</html>`;
	return { subject: message.subject, text, html };
}
