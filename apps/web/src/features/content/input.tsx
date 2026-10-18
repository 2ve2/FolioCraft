/** Accessible native field for localized content editing. */
export function Input({
	label,
	value,
	onChange,
	multiline = false,
	max = 5000,
	type = "text",
	locale = "en",
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	multiline?: boolean;
	max?: number;
	type?: string;
	locale?: "ar" | "en";
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: Both conditional branches contain the native control inside this label.
		<label className="field">
			<span>{label}</span>
			{multiline ? (
				<textarea
					dir="auto"
					rows={4}
					maxLength={max}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			) : (
				<input
					className={type === "date" ? "content-date" : undefined}
					lang={type === "date" ? locale : undefined}
					dir={
						type === "date" ? (locale === "ar" ? "rtl" : "ltr") : type === "url" ? "ltr" : "auto"
					}
					type={type}
					onInput={type === "date" ? (e) => onChange(e.currentTarget.value) : undefined}
					maxLength={max}
					value={value}
					onChange={(e) => onChange(e.target.value)}
				/>
			)}
		</label>
	);
}
