import { APIError } from "better-auth/api";
import nodemailer from "nodemailer";
import { env, mailConfigured } from "../config/env";

const transport = mailConfigured
	? nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			requireTLS: !env.SMTP_SECURE,
			auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
			connectionTimeout: 10000,
			greetingTimeout: 10000,
			socketTimeout: 15000,
			disableFileAccess: true,
			disableUrlAccess: true,
		})
	: undefined;
/** Escapes user-facing labels before embedding them in an authentication email. */
const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
	);
/** Sends a native authentication link through the configured transport after validating its origin. */
export async function sendAuthMail(
	to: string,
	name: string,
	url: string,
	kind: "verify" | "reset",
) {
	if (!transport)
		throw new APIError("SERVICE_UNAVAILABLE", {
			code: "MAIL_UNAVAILABLE",
			message: "Email delivery is not configured",
		});
	const link = new URL(url);
	if (link.origin !== new URL(env.API_URL).origin || !["http:", "https:"].includes(link.protocol))
		throw new Error("Invalid authentication mail URL");
	const action =
		kind === "verify"
			? "Verify your email / تأكيد البريد الإلكتروني"
			: "Reset your password / إعادة تعيين كلمة المرور";
	try {
		const delivery = await transport.sendMail({
			from: env.MAIL_FROM,
			to,
			subject: `FolioCraft — ${action}`,
			text: `${name}\n\n${action}\n${url}\n\nIf you did not request this, ignore this message.\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.`,
			html: `<p>${escapeHtml(name)}</p><p>${escapeHtml(action)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p><p>If you did not request this, ignore this message.<br>إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>`,
		});
		if (!delivery.accepted?.length || delivery.rejected?.length)
			throw new Error("SMTP rejected delivery");
	} catch {
		throw new APIError("SERVICE_UNAVAILABLE", {
			code: "MAIL_DELIVERY_FAILED",
			message: "Email could not be sent. Please try again later.",
		});
	}
}
