import { hasRichContent, type Project, type RichBlock } from "@folio/contracts";
import { keyed } from "./format";

/** Structured text renders React nodes; saved markup is never interpreted as HTML. */
export function RichContent({ body, blocks }: { body: string; blocks?: RichBlock[] }) {
	return (
		<div className="folio__rich">
			{hasRichContent(blocks)
				? keyed(blocks ?? []).map(({ value: block, key }) => {
						if (block.type === "heading")
							return block.level === 2 ? (
								<h2 key={key} dir="auto">
									{block.text}
								</h2>
							) : (
								<h3 key={key} dir="auto">
									{block.text}
								</h3>
							);
						if (block.type === "list") {
							const items = keyed(block.items).map(({ value: text, key: itemKey }) => (
								<li key={itemKey} dir="auto">
									{text}
								</li>
							));
							return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
						}
						return (
							<p key={key} dir="auto">
								{block.text}
							</p>
						);
					})
				: body && <p dir="auto">{body}</p>}
		</div>
	);
}

/** Renders only the project gallery images with available verified URLs. */
export function Gallery({
	project,
	assetUrls,
}: {
	project: Project;
	assetUrls: Record<string, string>;
}) {
	const ids = (project.galleryAssetIds ?? []).filter((id) => assetUrls[id]);
	return (
		ids.length > 0 && (
			<div className="folio__gallery">
				{ids.map((id) => (
					<img key={id} src={assetUrls[id]} alt={project.title} loading="lazy" />
				))}
			</div>
		)
	);
}

/** Public details share the exact portfolio shell and rich content used by editor preview. */
