"use client";
import type { Article, Education, Experience, Skill } from "@ichnara/contracts";

import { labels } from "./copy";
import { moveItem } from "./reorder";
import type { ContentEditorProps } from "./types";

/** Provides ordering and confirmed removal controls for a draft collection. */
export function CollectionActions({
	draft,
	locale,
	update,
	collection,
	index,
}: Omit<ContentEditorProps, "siteId"> & {
	collection: "experiences" | "education" | "skills" | "articles";
	index: number;
}) {
	const t = labels[locale];
	return (
		<div className="content-actions">
			<button
				type="button"
				className="text-button"
				disabled={index === 0}
				onClick={() =>
					update((d) => ({
						...d,
						[collection]: moveItem<Experience | Education | Skill | Article>(
							d[collection] ?? [],
							index,
							-1,
						),
					}))
				}
			>
				{t.up}
			</button>
			<button
				type="button"
				className="text-button"
				disabled={index === (draft[collection]?.length ?? 0) - 1}
				onClick={() =>
					update((d) => ({
						...d,
						[collection]: moveItem<Experience | Education | Skill | Article>(
							d[collection] ?? [],
							index,
							1,
						),
					}))
				}
			>
				{t.down}
			</button>
			<button
				type="button"
				className="danger-button"
				onClick={() => {
					if (window.confirm(t.confirm))
						update((d) => ({
							...d,
							[collection]: (d[collection] ?? []).filter((_, i) => i !== index),
						}));
				}}
			>
				{t.remove}
			</button>
		</div>
	);
}
