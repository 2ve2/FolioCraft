"use client";
import { type Article, collectAssetIds, newId } from "@ichnara/contracts";
import { AssetPicker } from "../assets/asset-picker";
import { CollectionActions } from "./collection-actions";
import { labels } from "./copy";
import { Input } from "./input";
import { RichEditor } from "./rich-editor";
import type { ContentEditorProps } from "./types";

/** Edits article drafts, publication flags and optional media. */
export function ArticlesEditor({ draft, locale, update, siteId }: ContentEditorProps) {
	const t = labels[locale];

	/** Changes one article while retaining the rest of the draft. */
	const patchArticle = (id: string, patch: Partial<Article>) =>
		update((d) => ({
			...d,
			articles: (d.articles ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
		}));

	return (
		<section className="editor-card" id="studio-articles">
			<h2>{t.articles}</h2>
			{(draft.articles ?? []).map((x, i) => (
				<div className="collection-item" key={x.id}>
					<CollectionActions
						draft={draft}
						locale={locale}
						update={update}
						collection="articles"
						index={i}
					/>
					<Input
						label={t.title}
						max={180}
						value={x.title}
						onChange={(title) => patchArticle(x.id, { title })}
					/>
					<Input
						label={t.slug}
						max={50}
						value={x.slug}
						onChange={(slug) => patchArticle(x.id, { slug })}
					/>
					<Input
						label={t.summary}
						multiline
						max={700}
						value={x.summary}
						onChange={(summary) => patchArticle(x.id, { summary })}
					/>
					<Input
						label={t.body}
						multiline
						max={50000}
						value={x.body}
						onChange={(body) => patchArticle(x.id, { body })}
					/>
					<RichEditor
						locale={locale}
						value={x.richBody}
						onChange={(richBody) => patchArticle(x.id, { richBody })}
					/>
					<AssetPicker
						key={x.id}
						protectedIds={collectAssetIds(draft)}
						label={t.cover}
						locale={locale}
						siteId={siteId}
						value={x.coverAssetId}
						onChange={(coverAssetId) => patchArticle(x.id, { coverAssetId })}
					/>
					<label className="toggle-field">
						<input
							type="checkbox"
							checked={x.published}
							onChange={(e) => patchArticle(x.id, { published: e.target.checked })}
						/>
						<span>{t.published}</span>
					</label>
				</div>
			))}
			<button
				className="secondary"
				type="button"
				disabled={(draft.articles?.length ?? 0) >= 100}
				onClick={() =>
					update((d) => ({
						...d,
						articles: [
							...(d.articles ?? []),
							{
								id: newId(),
								title: "",
								slug: "",
								summary: "",
								body: "",
								published: false,
							},
						],
					}))
				}
			>
				{t.add} {t.articles}
			</button>
		</section>
	);
}
