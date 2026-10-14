import { type Article, calculateReadTime, type Locale } from "@folio/contracts";
export function safeHttpUrl(value: string): string | undefined {
	try {
		const url = new URL(value);
		return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
	} catch {
		return undefined;
	}
}

export function keyed<T>(values: T[]): { value: T; key: string }[] {
	const counts = new Map<string, number>();
	return values.map((value) => {
		const serialized = JSON.stringify(value);
		const count = counts.get(serialized) ?? 0;
		counts.set(serialized, count + 1);
		return { value, key: `${serialized}:${count}` };
	});
}
export function readingTime(article: Article, locale: Locale): string {
	const minutes = calculateReadTime(article);
	if (locale === "en") return `${minutes} min read`;
	if (minutes === 1) return "دقيقة واحدة للقراءة";
	if (minutes === 2) return "دقيقتان للقراءة";
	const plural = minutes % 100 >= 3 && minutes % 100 <= 10;
	return `${minutes} ${plural ? "دقائق" : "دقيقة"} للقراءة`;
}
