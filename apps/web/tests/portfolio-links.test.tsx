import { expect, test } from "bun:test";
import { emptyDraft, newId } from "@ichnara/contracts";
import { Portfolio } from "@ichnara/portfolio";
import { renderToStaticMarkup } from "react-dom/server";

/** Collects every anchor that opens a new tab in the rendered markup. */
const externalAnchors = (html: string) => html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? [];

test("owner links open safely and pass no ranking; non-HTTP(S) targets never render", () => {
	const draft = emptyDraft("ar");
	draft.profile.name = "حساب تجريبي";
	draft.profile.website = "https://example.com/";
	draft.profile.email = "owner@example.com";
	draft.profile.socialLinks = [{ label: "GitHub", url: "https://github.com/example" }];
	draft.projects = [
		{
			id: newId(),
			title: "Project",
			summary: "",
			body: "",
			role: "",
			year: "",
			tools: "",
			url: "https://example.com/work",
		},
	];
	const anchors = externalAnchors(renderToStaticMarkup(<Portfolio draft={draft} assetUrls={{}} />));
	expect(anchors.length).toBeGreaterThanOrEqual(3);
	for (const anchor of anchors) expect(anchor).toContain('rel="ugc nofollow noopener noreferrer"');

	// Stored data is validated, but the renderer must still refuse script and data targets.
	draft.profile.website = "javascript:alert(1)";
	draft.profile.socialLinks = [{ label: "Bad", url: "data:text/html,hi" }];
	draft.projects[0].url = "javascript:alert(1)";
	const unsafe = renderToStaticMarkup(<Portfolio draft={draft} assetUrls={{}} />);
	expect(unsafe).not.toContain("javascript:");
	expect(unsafe).not.toContain("data:text/html");
});
