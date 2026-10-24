import type { Locale } from "@ichnara/contracts";

export type AuthMailKind = "verify" | "reset" | "change-email" | "new-email" | "existing-account";
type MailContent = { subject: string; text: string; html: string };

/** Escapes user-facing values before embedding them in an authentication email. */
const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
	);

/**
 * Reads the interface language of the web page the native link returns to: its path prefix
 * (`/ar/reset-password`), or the legacy `?lang=ar|en` of links issued before path-based
 * languages. Anything missing or unexpected falls back to English.
 */
export function mailLocale(url: string): Locale {
	try {
		// Native links carry the page they return to; a direct web link is its own target.
		const raw = new URL(url).searchParams.get("callbackURL");
		const callback = new URL(raw ?? url);
		const prefix = callback.pathname.split("/")[1];
		const language =
			prefix === "ar" || prefix === "en" ? prefix : callback.searchParams.get("lang");
		return language === "ar" ? "ar" : "en";
	} catch {
		return "en";
	}
}

/**
 * Chooses the wording of a verification email from its token: Better Auth marks the link that
 * confirms a changed address, which must not read like a sign-up activation. Only the unverified
 * payload is read, for wording; the token is verified when the link is used.
 */
export function mailKindForToken(token: string): AuthMailKind {
	try {
		const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
		return payload?.requestType === "change-email-verification" ? "new-email" : "verify";
	} catch {
		return "verify";
	}
}

/** Lifetime of verification and reset links; the auth config uses it so the emails stay truthful. */
export const AUTH_LINK_MINUTES = 60;

/** Hosted 2x PNG logos (web public folder); width and height are the display size in CSS pixels. */
export const EMAIL_LOGOS = {
	en: { file: "ichnara-email-en.png", width: 200, height: 36 },
	ar: { file: "ichnara-email-ar.png", width: 151, height: 47 },
} as const;

const copy = {
	ar: {
		brand: "إيكنارا",
		tagline: "مساحة لأعمالك، بطريقتك",
		greeting: (name: string) => `مرحبًا ${name}،`,
		verify: {
			subject: "تأكيد بريدك الإلكتروني — إيكنارا",
			title: "أكّد بريدك الإلكتروني",
			preview: "خطوة أخيرة لتفعيل حسابك في إيكنارا.",
			intro: "اضغط الزر لتأكيد بريدك الإلكتروني وتفعيل حسابك.",
			action: "تأكيد البريد الإلكتروني",
			expiry: "الرابط صالح لمدة ساعة واحدة.",
		},
		reset: {
			subject: "إعادة تعيين كلمة المرور — إيكنارا",
			title: "إعادة تعيين كلمة المرور",
			preview: "رابط اختيار كلمة مرور جديدة لحسابك في إيكنارا.",
			intro: "وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر لاختيار كلمة مرور جديدة.",
			action: "إعادة تعيين كلمة المرور",
			expiry: "الرابط صالح لمدة ساعة واحدة ويُستخدم مرة واحدة.",
		},
		"change-email": {
			subject: "تأكيد تغيير البريد الإلكتروني — إيكنارا",
			title: "وافق على تغيير بريدك الإلكتروني",
			preview: "طلب لتغيير بريد تسجيل الدخول لحسابك في إيكنارا.",
			intro:
				"وصلنا طلب لتغيير بريد حسابك إلى {email}. اضغط الزر للموافقة، ثم نرسل رابط تأكيد إلى العنوان الجديد.",
			action: "الموافقة على التغيير",
			expiry: "الرابط صالح لمدة ساعة واحدة.",
			ignore: "إذا لم تطلب ذلك، تجاهل هذه الرسالة وغيّر كلمة مرورك من صفحة الحساب.",
		},
		"new-email": {
			subject: "تأكيد بريدك الجديد — إيكنارا",
			title: "أكّد بريدك الإلكتروني الجديد",
			preview: "خطوة أخيرة لاعتماد هذا البريد لحسابك في إيكنارا.",
			intro: "اضغط الزر لاعتماد هذا العنوان بريدًا جديدًا لتسجيل الدخول إلى حسابك.",
			action: "تأكيد البريد الجديد",
			expiry: "الرابط صالح لمدة ساعة واحدة.",
		},
		"existing-account": {
			subject: "محاولة تسجيل جديدة ببريدك — إيكنارا",
			title: "لديك حساب بهذا البريد من قبل",
			preview: "وصلنا طلب لإنشاء حساب جديد بعنوان بريدك.",
			intro:
				"وصلنا طلب لإنشاء حساب جديد في إيكنارا بهذا البريد، لكن لديك حساب به من قبل، فلم ننشئ حساباً آخر. إذا كنت أنت، سجّل الدخول من الزر، أو اختر «نسيت كلمة المرور؟» إن لم تتذكرها.",
			action: "تسجيل الدخول",
			expiry: "لا يحتاج حسابك إلى أي إجراء آخر.",
			ignore: "إذا لم تكن أنت، تجاهل هذه الرسالة؛ لم يتغير شيء في حسابك.",
		},
		fallback: "إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:",
		ignore: "إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن يتغير شيء في حسابك.",
		automated: "رسالة تلقائية، لا تحتاج إلى رد.",
	},
	en: {
		brand: "Ichnara",
		tagline: "A home for your work, on your terms",
		greeting: (name: string) => `Hi ${name},`,
		verify: {
			subject: "Verify your email — Ichnara",
			title: "Confirm your email",
			preview: "One last step to activate your Ichnara account.",
			intro: "Use the button below to verify your email address and activate your account.",
			action: "Verify email",
			expiry: "This link expires in one hour.",
		},
		reset: {
			subject: "Reset your password — Ichnara",
			title: "Reset your password",
			preview: "A link to choose a new password for your Ichnara account.",
			intro:
				"We received a request to reset your account password. Use the button below to choose a new one.",
			action: "Reset password",
			expiry: "This link works once and expires in one hour.",
		},
		"change-email": {
			subject: "Approve your email change — Ichnara",
			title: "Approve your email change",
			preview: "A request to change the sign-in email of your Ichnara account.",
			intro:
				"We received a request to change your account email to {email}. Approve it with the button below; we will then send a confirmation link to the new address.",
			action: "Approve change",
			expiry: "This link expires in one hour.",
			ignore:
				"If you did not ask for this, ignore this message and change your password from your account page.",
		},
		"new-email": {
			subject: "Confirm your new email — Ichnara",
			title: "Confirm your new email",
			preview: "One last step to use this address for your Ichnara account.",
			intro: "Use the button below to confirm this address as your new sign-in email.",
			action: "Confirm new email",
			expiry: "This link expires in one hour.",
		},
		"existing-account": {
			subject: "A new sign-up used your email — Ichnara",
			title: "You already have an account",
			preview: "Someone asked to create a new account with your email address.",
			intro:
				"We received a request to create a new Ichnara account with this email, but you already have one, so no second account was created. If this was you, sign in with the button below, or choose “Forgot password?” if you don’t remember it.",
			action: "Sign in",
			expiry: "Your account needs no other action.",
			ignore: "If this wasn’t you, ignore this message; nothing changed in your account.",
		},
		fallback: "If the button does not work, copy this link into your browser:",
		ignore: "If you did not request this, ignore this message and nothing will change.",
		automated: "This is an automated message; no reply is needed.",
	},
} as const;

/**
 * Builds a single-language authentication email with matching text and accessible HTML parts.
 * The HTML uses tables and inline styles so Gmail, Outlook and Apple Mail lay it out the same;
 * the logo is a hosted PNG with alt text, so the brand name still shows when images are blocked.
 */
export function authMailContent(
	kind: AuthMailKind,
	locale: Locale,
	name: string,
	url: string,
	webOrigin: string,
	newEmail = "",
): MailContent {
	const t = copy[locale];
	const message = t[kind];
	const ignore = "ignore" in message ? message.ignore : t.ignore;
	// Only the email-change approval names an address: the requested new one.
	const introText = message.intro.replace("{email}", newEmail);
	const introHtml = escapeHtml(message.intro).replace(
		"{email}",
		`<b dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(newEmail)}</b>`,
	);
	const dir = locale === "ar" ? "rtl" : "ltr";
	const align = locale === "ar" ? "right" : "left";
	const link = escapeHtml(url);
	const logo = EMAIL_LOGOS[locale];
	const logoUrl = escapeHtml(new URL(`/brand/ichnara/${logo.file}`, webOrigin).href);
	const font = locale === "ar" ? "Tahoma,Arial,sans-serif" : "Arial,'Segoe UI',sans-serif";
	const text = [
		message.title,
		"",
		t.greeting(name),
		"",
		introText,
		"",
		`${message.action}: ${url}`,
		"",
		message.expiry,
		ignore,
		"",
		`${t.brand} — ${t.tagline}`,
	].join("\n");
	const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(message.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${message.preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="max-width:560px;font-family:${font};color:#241b38;text-align:${align};">
<tr><td style="padding:0 4px 24px;" align="${align}">
<img src="${logoUrl}" width="${logo.width}" height="${logo.height}" alt="${t.brand}" style="display:block;border:0;outline:none;width:${logo.width}px;height:${logo.height}px;font-size:20px;font-weight:700;color:#3f46c8;">
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e7e5f0;border-radius:16px;padding:40px 36px;">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.4;font-weight:700;color:#241b38;">${message.title}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.7;">${escapeHtml(t.greeting(name))}</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#4a4560;">${introHtml}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}"><tr>
<td style="border-radius:10px;background:#3f46c8;"><a href="${link}" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${message.action}</a></td>
</tr></table>
<p style="clear:both;margin:0;padding-top:24px;font-size:14px;line-height:1.7;color:#6b6880;">${message.expiry}</p>
<hr style="border:0;border-top:1px solid #e7e5f0;margin:28px 0 20px;">
<p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#6b6880;">${t.fallback}</p>
<p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;" dir="ltr" align="left"><a href="${link}" style="color:#3f46c8;">${link}</a></p>
</td></tr>
<tr><td style="padding:24px 4px 0;font-size:13px;line-height:1.7;color:#6b6880;" align="${align}">
<p style="margin:0 0 6px;">${ignore}</p>
<p style="margin:0;">${t.brand} · ${t.tagline} · ${t.automated}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
	return { subject: message.subject, text, html };
}
