import { collectAssetIds, type PublicSite } from "@folio/contracts";
import { notFound } from "next/navigation";

/** Loads the accessible public release without forwarding a private session. */
export async function readPublished<T>(slug: string, suffix = ""): Promise<T | null> {
	const origin = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
	let response: Response;
	try {
		response = await fetch(`${origin}/api/public/sites/${encodeURIComponent(slug)}${suffix}`, {
			cache: "no-store",
		});
	} catch {
		return null;
	}
	if (response.status === 404) notFound();
	const data = await response.json().catch(() => null);
	return response.ok && data?.status && data.result ? (data.result as T) : null;
}

/** Maps release image references to the guarded public asset gateway. */
export function publicAssets(site: PublicSite): Record<string, string> {
	const origin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
	return Object.fromEntries(
		collectAssetIds(site.draft).map((id) => [
			id,
			`${origin}/api/public/sites/${encodeURIComponent(site.slug)}/assets/${encodeURIComponent(id)}`,
		]),
	);
}

/** Shows recoverable public-read failure feedback without fabricating content. */
export function PublicUnavailable() {
	return (
		<main className="public-error">
			<h1>تعذر تحميل الموقع · Portfolio unavailable</h1>
			<p>
				تعذر تحميل النسخة المنشورة. حاول مجددًا لاحقًا.
				<br />
				The published portfolio is unavailable. Please try again later.
			</p>
		</main>
	);
}
