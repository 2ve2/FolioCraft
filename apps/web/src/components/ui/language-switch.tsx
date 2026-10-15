"use client";
import type { Locale } from "@folio/contracts";
import { Languages } from "lucide-react";
import { SelectControl } from "./select-control";

/** Changes editor language through the same reusable selection design as every form. */
export function LanguageSwitch({
	locale,
	onChange,
	label,
}: {
	locale: Locale;
	onChange: (locale: Locale) => void;
	label?: string;
}) {
	const ar = locale === "ar";
	return (
		<SelectControl
			compact
			label={label ?? (ar ? "لغة الاستوديو" : "Studio language")}
			value={locale}
			onChange={(value) => onChange(value as Locale)}
			icon={<Languages size={16} />}
			menuTitle={ar ? "لغة الواجهة" : "Interface language"}
			options={[
				{
					value: "ar",
					label: "العربية",
					code: "AR",
					description: ar ? "واجهة من اليمين لليسار" : "Right-to-left interface",
				},
				{
					value: "en",
					label: "English",
					code: "EN",
					description: ar ? "واجهة من اليسار لليمين" : "Left-to-right interface",
				},
			]}
		/>
	);
}
