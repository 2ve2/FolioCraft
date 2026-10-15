import type { ReactNode } from "react";

/** Groups a labelled native control with optional supporting text. */
export function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: Each Field caller supplies its input/select/textarea child; the label wraps that native control.
		<label className="field">
			<span>{label}</span>
			{children}
			{hint && <small>{hint}</small>}
		</label>
	);
}
