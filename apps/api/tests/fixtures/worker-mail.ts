import { betterAuth } from "better-auth";
import { sendAuthMail } from "../../src/lib/auth/mail";
import { withMailRequestId } from "../../src/lib/auth/mail-context";

// Fictional in-memory users only; no application database or real provider is used.
const { memoryAdapter } = await import("better-auth/adapters/memory");
const auth = betterAuth({
	baseURL: "https://api.example.invalid",
	secret: "synthetic-worker-auth-secret-at-least-32-characters",
	database: memoryAdapter({
		user: ["native-success", "native-failure"].map((name) => ({
			id: name,
			name,
			email: `${name}@example.invalid`,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		})),
		account: [],
		session: [],
		verification: [],
	}),
	logger: { disabled: true },
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => sendAuthMail(user.email, user.name, url, "reset"),
	},
});

export default {
	/** Exercises real mail and installed native reset behavior inside workerd. */
	async fetch(request: Request) {
		const scenario = new URL(request.url).pathname.slice(1);
		const requestId = crypto.randomUUID();
		return withMailRequestId(requestId, async () => {
			if (scenario.startsWith("native-")) {
				const response = await auth.handler(
					new Request("https://api.example.invalid/api/auth/request-password-reset", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email: `${scenario}@example.invalid` }),
					}),
				);
				return Response.json({ status: response.status, body: await response.json(), requestId });
			}
			try {
				await sendAuthMail(
					`${scenario}@example.invalid`,
					'<synthetic-name>&"',
					scenario === "invalid-link"
						? "https://outside.invalid/private-token"
						: "https://api.example.invalid/reset-password/private-token?callbackURL=https%3A%2F%2Fweb.example.invalid",
					scenario === "verify" ? "verify" : "reset",
				);
				return Response.json({ accepted: true, requestId });
			} catch {
				return Response.json({ accepted: false, requestId });
			}
		});
	},
};
