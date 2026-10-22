import type { Page } from "@playwright/test";
import { expect, type Locale } from "./fixtures";

// These are exact product exceptions, not permission to ignore arbitrary Latin/Arabic text.
const allowedTokens = [
	"Ichnara",
	"Cloudflare",
	"Neon",
	"Resend",
	"Sentry",
	"UptimeRobot",
	"IP",
	"English",
	"العربية",
	"JSON",
	"PNG",
	"JPG",
	"JPEG",
	"WebP",
	"SVG",
	"PDF",
	"URL",
	"AR",
	"EN",
	"https://",
	"http://",
	"your-name",
	"/p/",
	"px",
];

/** Inspects rendered text, visible control metadata and the title, excluding hidden artwork. */
export async function expectSingleLanguage(page: Page, locale: Locale, userContent: string[] = []) {
	const samples = await page.evaluate(() => {
		const values: { source: string; value: string }[] = [
			{ source: "document.title", value: document.title },
		];
		const visible = (element: Element) =>
			!element.closest('[aria-hidden="true"], script, style, noscript') &&
			element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			const node = walker.currentNode;
			if (node.parentElement && visible(node.parentElement) && node.textContent?.trim())
				values.push({ source: node.parentElement.tagName, value: node.textContent.trim() });
		}
		for (const element of document.querySelectorAll("[placeholder], [aria-label]")) {
			if (!visible(element)) continue;
			for (const attribute of ["placeholder", "aria-label"]) {
				const value = element.getAttribute(attribute);
				if (value) values.push({ source: `${element.tagName}[${attribute}]`, value });
			}
		}
		return values;
	});
	const otherScript = locale === "ar" ? /\p{Script=Latin}/u : /\p{Script=Arabic}/u;
	const exceptions = [...allowedTokens, ...userContent].sort((a, b) => b.length - a.length);
	const mixed = samples.filter(({ value }) => {
		if (userContent.includes(value)) return false;
		let remaining = value;
		for (const allowed of exceptions) {
			if (allowed.length < 2) continue;
			const literal = allowed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			remaining = remaining.replace(new RegExp(`(?<!\\p{L})${literal}(?!\\p{L})`, "gu"), "");
		}
		return otherScript.test(remaining);
	});
	expect(mixed, `Mixed language on ${new URL(page.url()).pathname}`).toEqual([]);
}
