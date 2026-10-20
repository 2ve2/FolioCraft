# SMTP rollout diagnostics and prepared HTTP fallback

Updated2026-10-20. This is an operational plan, not an applied transport change or delivery acceptance.

## Selected configuration
Resend domain verification is human-reported. API variables: smtp.resend.com,465,secure=true,user=resend,from=no-reply@lord2ve.tech. Human selected the bare address because the existing MAIL_FROM validator accepts email addresses, not display-name mailbox syntax. Keep TRIAL_SKIP_EMAIL_VERIFICATION=true for this trial. SMTP_PASSWORD is a Worker secret; never place credentials in commands, Git, diagnostic output or regular files.

Resend documents465 as implicit TLS and uses an API key as the SMTP password: [SMTP configuration](https://resend.com/docs/send-with-smtp). Workers provides a Node TLS implementation under its compatibility support; actual Nodemailer socket/TLS interoperability still requires the human-triggered test, not a readiness flag: [Workers TLS](https://developers.cloudflare.com/workers/runtime-apis/nodejs/tls/).

## What the human should inspect on a failed browser reset request
1. In browser Network, inspect POST https://api.lord2ve.tech/api/auth/request-password-reset. Record only time, HTTP status, code and X-Request-Id, never request bodies, recipient addresses, cookies or reset URLs.
2.503 MAIL_UNAVAILABLE means the application sees mail as unconfigured.503 MAIL_DELIVERY_FAILED means sendAuthMail caught a transport error or an unsuccessful accepted/rejected result. A successful reset-request response alone is not proof that a message arrived or even that the recipient exists.
3. In Cloudflare Workers & Pages -> foliocraft-api-trial -> Logs/Live logs, correlate the timestamp and request ID with the request event/status. Existing auth logger emits auth_warning_or_error with severity only. Review any platform startup/uncaught socket exception if present.
4. IMPORTANT: current sendAuthMail catch intentionally replaces the raw Nodemailer error; current auth logger omits payloads. Raw ESOCKET/ETIMEDOUT/ECONNRESET/ECONNREFUSED/EAUTH/TLS certificate details are NOT guaranteed to appear in current Worker logs. There is no existing dedicated sanitized mail-transport event. Do not claim an exact TLS/socket cause from MAIL_DELIVERY_FAILED alone, or enable broad SMTP debug logging that may expose credentials, recipients or reset links.
5. If the Worker connects to SMTP465, failures could be connection/greeting timeout, socket/TLS support or negotiation, credentials/permissions, or sender rejection. Current configured timeouts: connection10s,greeting10s,socket15s; requireTLS=false because secure=true establishes implicit TLS. These are possibilities, not observed failures in this task. No SMTP connection or send probe was performed.
6. Check the Resend Emails dashboard after the human sends. Resend says SMTP submissions appear there, but it does not provide SMTP server logs: [SMTP FAQ](https://resend.com/docs/send-with-smtp#faq). Presence/provider acceptance is distinct from recipient delivery.

## Prepared fallback — NOT APPLIED
- Require a separately approved code change/deployment if the SMTP attempt fails. Keep Better Auth callbacks, validated native auth-link origin, subjects, text/html escaping, trial flag and truthful error contract unchanged.
- Replace only the transport in apps/api/src/lib/auth/mail.ts with native fetch POST https://api.resend.com/emails. Use the existing server-only Resend key from SMTP_PASSWORD as Bearer authorization in memory; no new SDK, client credential, database/R2/role change or second key copy is needed. Send from,to,subject,text,html as supported by the [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email).
- Use a bounded HTTP timeout; accept only a successful provider response with its message ID. Map provider failures to the existing MAIL_DELIVERY_FAILED response. A message ID means provider acceptance, not mailbox delivery.
- Do not auto-switch transports or retry after an ambiguous SMTP timeout: it could duplicate a message already accepted. Make a reviewed transport selection instead; any future HTTP retries need one stable per-attempt idempotency key and explicit duplicate-send semantics.
- If detailed diagnostics are approved, add only a finite sanitized event (transport,stage,allowlisted error code,provider status). Never log raw Error/message/stack, auth headers, body, recipient, link, cookie or SMTP dialogue. No such logging change is included in this configuration-only task.
- Test using a fake HTTP transport and local guarded tests before an API-only deployment. Retain the prior SMTP version for rollback and let the human perform the real browser request. This fallback remains a plan; no source file implements it now.
