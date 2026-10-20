type MailPayload = { from: string; to: string; subject: string; text: string; html: string };

/** Carries only finite, non-sensitive transport diagnostics. */
export class MailTransportError extends Error {
	constructor(readonly code: string) {
		super("Mail transport failed");
		this.name = "MailTransportError";
	}
}

/** Awaits one bounded Resend submission; provider acceptance does not prove delivery. */
export async function sendResendMail(payload: MailPayload, key: string) {
	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(15000),
			redirect: "manual",
		});
		if (!response.ok) {
			// Never parse or log provider error bodies: they may contain addresses.
			await response.body?.cancel();
			throw new MailTransportError(`HTTP_${response.status}`);
		}
		const result: unknown = await response.json();
		if (
			!result ||
			typeof result !== "object" ||
			!("id" in result) ||
			typeof result.id !== "string" ||
			!result.id.trim()
		)
			throw new MailTransportError("INVALID_RESPONSE");
	} catch (error) {
		if (error instanceof MailTransportError) throw error;
		const name = error instanceof Error ? error.name : "";
		throw new MailTransportError(
			name === "TimeoutError" || name === "AbortError"
				? "TIMEOUT"
				: name === "SyntaxError"
					? "INVALID_RESPONSE"
					: "NETWORK_ERROR",
		);
	}
}
