"use client";
import type { Locale, Project } from "@folio/contracts";
import { AssetPicker } from "../assets/asset-picker";

import { labels } from "./copy";
import { Input } from "./input";
import { moveItem } from "./reorder";
import { RichEditor } from "./rich-editor";

/** Edits additional project fields, media references and structured content. */
export function ProjectExtras({
	project,
	siteId,
	protectedIds,
	locale,
	onChange,
}: {
	project: Project;
	siteId: string;
	protectedIds: string[];
	locale: Locale;
	onChange: (patch: Partial<Project> | ((project: Project) => Partial<Project>)) => void;
}) {
	const t = labels[locale];
	return (
		<>
			<Input
				label={t.slug}
				max={50}
				value={project.slug ?? ""}
				onChange={(slug) => onChange({ slug: slug || undefined })}
			/>
			<label className="toggle-field">
				<input
					type="checkbox"
					checked={project.featured ?? false}
					onChange={(e) => onChange({ featured: e.target.checked })}
				/>
				<span>{t.featured}</span>
			</label>
			<Input
				label={t.results}
				multiline
				max={4000}
				value={project.results ?? ""}
				onChange={(results) => onChange({ results })}
			/>
			<AssetPicker
				protectedIds={protectedIds}
				key={`cover-${project.id}`}
				label={t.cover}
				siteId={siteId}
				locale={locale}
				value={project.coverAssetId}
				onChange={(coverAssetId) => onChange({ coverAssetId })}
			/>
			<h3>{t.gallery}</h3>
			{(project.galleryAssetIds ?? []).map((id, index) => (
				<div className="content-actions" key={id}>
					<span>{index + 1}</span>
					<button
						type="button"
						className="text-button"
						disabled={index === 0}
						onClick={() =>
							onChange((current) => ({
								galleryAssetIds: moveItem(current.galleryAssetIds ?? [], index, -1),
							}))
						}
					>
						{t.up}
					</button>
					<button
						type="button"
						className="text-button"
						disabled={index === (project.galleryAssetIds?.length ?? 0) - 1}
						onClick={() =>
							onChange((current) => ({
								galleryAssetIds: moveItem(current.galleryAssetIds ?? [], index, 1),
							}))
						}
					>
						{t.down}
					</button>
					<button
						type="button"
						className="danger-button"
						onClick={() =>
							onChange((current) => ({
								galleryAssetIds: current.galleryAssetIds?.filter((asset) => asset !== id),
							}))
						}
					>
						{t.remove}
					</button>
				</div>
			))}
			{(project.galleryAssetIds?.length ?? 0) < 12 && (
				<AssetPicker
					protectedIds={protectedIds}
					key={`gallery-${project.id}`}
					label={t.add}
					siteId={siteId}
					locale={locale}
					value={null}
					onChange={(id) => {
						if (id && !project.galleryAssetIds?.includes(id))
							onChange((current) => ({
								galleryAssetIds:
									current.galleryAssetIds?.includes(id) ||
									(current.galleryAssetIds?.length ?? 0) >= 12
										? current.galleryAssetIds
										: [...(current.galleryAssetIds ?? []), id],
							}));
					}}
				/>
			)}
			<RichEditor
				locale={locale}
				value={project.richBody}
				onChange={(richBody) => onChange({ richBody })}
			/>
		</>
	);
}

/** Extended collections preserve all unrelated draft content on every edit. */
