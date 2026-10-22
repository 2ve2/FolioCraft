import { z } from "zod";
import { idSchema } from "./ids";

export const PUBLIC_CACHE_PREFIX = "/ichnara-isr";
export const REVALIDATION_PATH = "/api/internal/revalidate-portfolio";
export const PUBLIC_CACHE_TAG_PREFIX = "ichnara:portfolio:";

export const invalidationSchema = z
	.object({
		siteId: idSchema,
		deliveryId: idSchema,
		slug: z
			.string()
			.min(3)
			.max(63)
			.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	})
	.strict();

/** Uses stable site and address tags together, including an address retained after deletion. */
export function portfolioTags(siteId: string, slug: string) {
	return [`${PUBLIC_CACHE_TAG_PREFIX}site:${siteId}`, `${PUBLIC_CACHE_TAG_PREFIX}slug:${slug}`];
}

/** A fresh receipt proves this attempt persisted, even if Next swallowed a completion error. */
export function portfolioReceipt(deliveryId: string) {
	return `${PUBLIC_CACHE_TAG_PREFIX}ack:${deliveryId}`;
}

/** Restricts ISR to portfolio documents; sitemap and arbitrary descendants stay dynamic. */
export function portfolioDocument(pathname: string) {
	return /^\/p\/[a-z0-9-]+(?:\/(?:projects|articles)\/[^/]+)?\/?$/.test(pathname);
}
