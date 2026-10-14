import type { Locale } from "@folio/contracts";
import { copy } from "./copy";
export function SectionHeading({ title }: { title: string }) {
	return (
		<div className="folio__section-heading">
			<h2>{title}</h2>
		</div>
	);
}
export function DateRange({
	start,
	end,
	locale,
	current = false,
}: {
	start: string;
	end: string | null;
	locale: Locale;
	current?: boolean;
}) {
	const format = (value: string) => {
		const date = new Date(`${value}T00:00:00Z`);
		if (!Number.isFinite(date.getTime())) return value;
		return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
			year: "numeric",
			month: "short",
			timeZone: "UTC",
		}).format(date);
	};
	return (
		<span>
			<bdi>{format(start)}</bdi>
			{(end || current) && (
				<>
					{" "}
					— <bdi>{end ? format(end) : copy[locale].present}</bdi>
				</>
			)}
		</span>
	);
}
