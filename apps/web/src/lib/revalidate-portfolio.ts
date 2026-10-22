import { createHash, timingSafeEqual } from "node:crypto";
import {
	invalidationSchema,
	portfolioReceipt,
	portfolioTags,
} from "@ichnara/contracts/public-cache";

/** Compares fixed-size digests in constant time, including absent/wrong credentials. */
function revalidationAuthorized(header: string | null, secret: string | undefined) {
	const expected = createHash("sha256")
		.update(`Bearer ${secret ?? ""}`)
		.digest();
	const supplied = createHash("sha256")
		.update(header?.slice(0, 2048) ?? "")
		.digest();
	return timingSafeEqual(expected, supplied) && !!secret && secret.length >= 32;
}

/** Validates the private message before invoking Next's immediate tag-expiration API. */
export async function revalidatePortfolio(
	request: Request,
	secret: string | undefined,
	expire: (tag: string) => void,
) {
	const headers = { "cache-control": "no-store" };
	if (!revalidationAuthorized(request.headers.get("authorization"), secret))
		return new Response(null, { status: 401, headers });
	if (request.method !== "POST") return new Response(null, { status: 405, headers });
	const body = await request.text();
	if (body.length > 1024) return new Response(null, { status: 413, headers });
	let input: unknown;
	try {
		input = JSON.parse(body);
	} catch {
		return new Response(null, { status: 400, headers });
	}
	const parsed = invalidationSchema.safeParse(input);
	if (!parsed.success) return new Response(null, { status: 400, headers });
	for (const tag of portfolioTags(parsed.data.siteId, parsed.data.slug)) expire(tag);
	expire(portfolioReceipt(parsed.data.deliveryId));
	return new Response(null, { status: 204, headers });
}
