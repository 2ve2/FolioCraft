"use client";
import type { Locale, RichBlock } from "@ichnara/contracts";
import { SelectControl } from "../../components/ui/select-control";

import { labels } from "./copy";
import { Input } from "./input";
import { moveItem } from "./reorder";

/** Edit only allowed structured blocks; text is never interpreted as HTML. */
export function RichEditor({
	value = [],
	onChange,
	locale,
}: {
	value?: RichBlock[];
	onChange: (blocks: RichBlock[]) => void;
	locale: Locale;
}) {
	const t = labels[locale];
	return (
		<div className="rich-editor">
			<h3>{t.blocks}</h3>
			<p className="rich-source-note">
				{locale === "ar"
					? "الكتل المكتوبة تُعرض بدل النص العادي أعلاه. النص العادي محفوظ؛ الكتل الفارغة لا تخفيه."
					: "Written blocks are shown instead of the plain text above. Plain text is retained; empty blocks do not hide it."}
			</p>
			{value.map((block, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Contract blocks have no IDs and contain only controlled fields with no local state.
				<div className="rich-block" key={`${index}-${block.type}`}>
					<div className="content-actions">
						<span>{t[block.type]}</span>
						<button
							type="button"
							className="text-button"
							disabled={index === 0}
							onClick={() => onChange(moveItem(value, index, -1))}
						>
							{t.up}
						</button>
						<button
							type="button"
							className="text-button"
							disabled={index === value.length - 1}
							onClick={() => onChange(moveItem(value, index, 1))}
						>
							{t.down}
						</button>
						<button
							type="button"
							className="danger-button"
							onClick={() => onChange(value.filter((_, i) => i !== index))}
						>
							{t.remove}
						</button>
					</div>
					{block.type === "list" ? (
						<>
							<Input
								label={t.lines}
								multiline
								value={block.items.join("\n")}
								onChange={(text) =>
									onChange(
										value.map((b, i) => (i === index ? { ...block, items: text.split("\n") } : b)),
									)
								}
							/>
							<label className="toggle-field">
								<input
									type="checkbox"
									checked={block.ordered}
									onChange={(e) =>
										onChange(
											value.map((b, i) =>
												i === index ? { ...block, ordered: e.target.checked } : b,
											),
										)
									}
								/>
								<span>{t.ordered}</span>
							</label>
						</>
					) : (
						<>
							<Input
								label={t[block.type]}
								multiline={block.type === "paragraph"}
								max={block.type === "heading" ? 200 : 4000}
								value={block.text}
								onChange={(text) =>
									onChange(value.map((b, i) => (i === index ? { ...block, text } : b)))
								}
							/>
							{block.type === "heading" && (
								<div className="field">
									<span>{t.heading}</span>
									<SelectControl
										label={locale === "ar" ? "مستوى العنوان" : "Heading level"}
										value={String(block.level)}
										options={[
											{
												value: "2",
												label: locale === "ar" ? "عنوان رئيسي" : "Section heading",
												code: "H2",
											},
											{
												value: "3",
												label: locale === "ar" ? "عنوان فرعي" : "Subheading",
												code: "H3",
											},
										]}
										onChange={(level) =>
											onChange(
												value.map((b, i) =>
													i === index ? { ...block, level: Number(level) as 2 | 3 } : b,
												),
											)
										}
									/>
								</div>
							)}
						</>
					)}
				</div>
			))}
			<div className="content-actions">
				{(["paragraph", "heading", "list"] as const).map((type) => (
					<button
						className="secondary"
						type="button"
						key={type}
						disabled={value.length >= 100}
						onClick={() =>
							onChange([
								...value,
								type === "paragraph"
									? { type, text: "" }
									: type === "heading"
										? { type, level: 2, text: "" }
										: { type, ordered: false, items: [""] },
							])
						}
					>
						{t.add} {t[type]}
					</button>
				))}
			</div>
		</div>
	);
}

/** Extra project fields share the studio's revisioned aggregate save. */
