"use client";
import { type Locale, slugSchema } from "@folio/contracts";
import { useEffect, useState } from "react";

/** Changes the real public address through the studio's revision-checked mutation. */
export function SiteAddress({
	slug,
	locale,
	busy,
	onSave,
}: {
	slug: string;
	locale: Locale;
	busy: boolean;
	onSave: (slug: string) => Promise<void>;
}) {
	const [value, setValue] = useState(slug);
	const [invalid, setInvalid] = useState(false);
	useEffect(() => {
		setValue(slug);
		setInvalid(false);
	}, [slug]);
	const ar = locale === "ar";
	return (
		<div className="field">
			<label htmlFor="site-address">{ar ? "عنوان الموقع العام" : "Public site address"}</label>
			<div className="slug-input" dir="ltr">
				<span>/p/</span>
				<input
					id="site-address"
					dir="ltr"
					value={value}
					maxLength={50}
					disabled={busy}
					aria-invalid={invalid}
					aria-describedby="site-address-hint"
					onChange={(e) => {
						setValue(e.target.value);
						setInvalid(false);
					}}
				/>
			</div>
			<small id="site-address-hint">
				{ar
					? "تغيير العنوان يغيّر الرابط العام مباشرة، ولا يضيف تحويلًا للرابط السابق."
					: "Changing the address updates the public URL immediately. The previous URL is not redirected."}
			</small>
			{invalid && (
				<p role="alert">
					{ar
						? "استخدم ٣–٥٠ حرفًا لاتينيًا صغيرًا أو رقمًا، مع شرطات بين الكلمات."
						: "Use 3–50 lowercase Latin letters or numbers, separated by hyphens."}
				</p>
			)}
			<button
				type="button"
				className="secondary"
				disabled={busy || value.trim() === slug}
				onClick={() => {
					const next = value.trim();
					if (!slugSchema.safeParse(next).success) {
						setInvalid(true);
						return;
					}
					void onSave(next);
				}}
			>
				{ar ? "حفظ العنوان" : "Save address"}
			</button>
		</div>
	);
}
