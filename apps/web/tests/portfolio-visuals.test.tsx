import { expect, test } from "bun:test";
import { collectAssetIds, draftSchema, emptyDraft } from "@folio/contracts";
import { Portfolio } from "@folio/portfolio";
import { renderToStaticMarkup } from "react-dom/server";

/** Hides optional decoration in the shared renderer without dropping content or owned references. */
test("profile and cover decoration can be hidden independently across locales and themes", () => {
	for (const locale of ["en", "ar"] as const) {
		for (const theme of ["light", "dark", "editorial"] as const) {
			const draft = emptyDraft(locale);
			draft.profile.name = "Fictional visual QA";
			draft.appearance.theme = theme;
			draft.projects = [
				{
					id: "cce1dfc5-a926-4a49-8a67-30d502f90534",
					title: "Project",
					summary: "",
					body: "",
					role: "",
					year: "",
					tools: "",
					url: "",
				},
			];
			const render = (assetUrls = {}) =>
				renderToStaticMarkup(<Portfolio draft={draft} assetUrls={assetUrls} />);
			expect(render()).toContain('class="folio__identity"');
			expect(render()).toContain('class="folio__art ');
			draft.appearance.profileVisualVisible = false;
			expect(render()).not.toContain('class="folio__identity"');
			expect(render()).toContain('class="folio__art ');
			draft.appearance.profileVisualVisible = true;
			draft.appearance.projectFallbackVisible = false;
			expect(render()).toContain('class="folio__identity"');
			expect(render()).not.toContain('class="folio__art ');
			const image = "7ef610b7-7426-4a12-98c1-1910e2203649";
			draft.profile.imageAssetId = image;
			draft.projects[0].coverAssetId = image;
			draft.appearance.profileVisualVisible = false;
			const before = JSON.stringify(draft);
			const markup = render({ [image]: "https://example.com/fixture.png" });
			expect(markup).not.toContain('class="folio__identity"');
			expect(markup).toContain('class="folio__cover"');
			expect(collectAssetIds(draft)).toEqual([image]);
			expect(JSON.stringify(draft)).toBe(before);
			expect(draftSchema.parse(draft).appearance.profileVisualVisible).toBe(false);
		}
	}
});
