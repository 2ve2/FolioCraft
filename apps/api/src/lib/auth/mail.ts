import { APIError } from "better-auth/api";
import nodemailer from "nodemailer";
import { env, mailConfigured } from "../../config/env";
import { mailRequestId } from "./mail-context";
import { type AuthMailKind, authMailContent, mailLocale } from "./mail-templates";
import { MailTransportError, sendResendMail } from "./resend";

const transport =
	mailConfigured && env.MAIL_TRANSPORT === "smtp"
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

/** Sends a native authentication link through the configured transport after validating its origin. */
export async function sendAuthMail(to: string, name: string, url: string, kind: AuthMailKind) {
	if (!mailConfigured)
		throw new APIError("SERVICE_UNAVAILABLE", {
			code: "MAIL_UNAVAILABLE",
			message: "Email delivery is not configured",
		});
	const requestId = mailRequestId();
	try {
		let link: URL;
		try {
			link = new URL(url);
		} catch {
			throw new MailTransportError("INVALID_LINK");
		}
		if (link.origin !== new URL(env.API_URL).origin || !["http:", "https:"].includes(link.protocol))
			throw new MailTransportError("INVALID_LINK");
		const payload = {
			// Display name keeps the sender recognisable; the address is the validated MAIL_FROM.
			from: `Ichnara <${env.MAIL_FROM as string}>`,
			to,
			...authMailContent(kind, mailLocale(url), name, url),
		};
		console.info(
			JSON.stringify({
				event: "auth_mail_attempt",
				requestId,
				kind,
				transport: env.MAIL_TRANSPORT,
			}),
		);
		if (env.MAIL_TRANSPORT === "resend_http") {
			await sendResendMail(payload, env.SMTP_PASSWORD as string);
		} else {
			const delivery = await transport?.sendMail(payload);
			if (!delivery?.accepted?.length || delivery.rejected?.length)
				throw new MailTransportError("SMTP_REJECTED");
		}
		console.info(
			JSON.stringify({
				event: "auth_mail_accepted",
				requestId,
				kind,
				transport: env.MAIL_TRANSPORT,
			}),
		);
	} catch (error) {
		const smtpCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
		const code =
			error instanceof MailTransportError
				? error.code
				: typeof smtpCode === "string" &&
						[
							"ESOCKET",
							"ETIMEDOUT",
							"ECONNRESET",
							"ECONNREFUSED",
							"EAUTH",
							"EENVELOPE",
							"EMESSAGE",
							"ETLS",
						].includes(smtpCode)
					? smtpCode
					: "TRANSPORT_ERROR";
		console.warn(
			JSON.stringify({
				event: "auth_mail_failed",
				requestId,
				kind,
				transport: env.MAIL_TRANSPORT,
				errorClass: "MailTransportError",
				code,
			}),
		);
		throw new APIError("SERVICE_UNAVAILABLE", {
			code: "MAIL_DELIVERY_FAILED",
			message: "Email could not be sent. Please try again later.",
		});
	}
}
