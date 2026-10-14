import { expect, test } from "bun:test";
import {
	articleInputSchema,
	calculateReadTime,
	draftSchema,
	emptyDraft,
	experienceSchema,
	publishedDraft,
	richBodySchema,
} from "@folio/contracts";

const article = (published: boolean) => ({
	id: crypto.randomUUID(),
	slug: published ? "public-article" : "private-article",
	title: "مقال",
	summary: "ملخص",
	body: "word ".repeat(401),
	published,
});

test("public projection excludes private articles and hidden content without mutating the draft", () => {
	const draft = draftSchema.parse({
		...emptyDraft("ar"),
		profile: {
			...emptyDraft("ar").profile,
			email: "private@example.com",
			website: "https://example.com",
			socialLinks: [{ label: "LinkedIn", url: "https://example.com/social" }],
		},
		articles: [article(true), article(false)],
		experiences: [
			{
				id: crypto.randomUUID(),
				organization: "Private org",
				role: "Designer",
				startDate: "2025-01-01",
				endDate: null,
				current: true,
				description: "hidden",
			},
		],
		sectionVisibility: { contact: false, experiences: false },
	});
	const before = JSON.stringify(draft);
	const publicData = publishedDraft(draft);
	expect(publicData.articles?.map((item) => item.slug)).toEqual(["public-article"]);
	expect(publicData.articles?.[0].readTimeMinutes).toBe(3);
	expect(publicData.experiences).toEqual([]);
	expect(publicData.profile.email).toBe("");
	expect(publicData.profile.website).toBe("");
	expect(publicData.profile.socialLinks).toEqual([]);
	expect(JSON.stringify(draft)).toBe(before);
});

test("rich content accepts bounded text blocks and rejects executable or unknown structures", () => {
	expect(
		richBodySchema.safeParse([
			{ type: "paragraph", text: "<script>alert(1)</script> is plain text" },
		]).success,
	).toBe(true);
	for (const unsafe of [
		[{ type: "html", html: "<script>alert(1)</script>" }],
		[{ type: "paragraph", text: "safe", html: "<img onerror=alert(1)>" }],
		[{ type: "image", src: "javascript:alert(1)" }],
		[{ type: "heading", level: 1, text: "Unsupported heading" }],
		Array.from({ length: 101 }, () => ({ type: "paragraph", text: "a" })),
	])
		expect(richBodySchema.safeParse(unsafe).success).toBe(false);
	expect(articleInputSchema.safeParse({ ...article(true), readTimeMinutes: 999 }).success).toBe(
		false,
	);
	expect(
		calculateReadTime({
			body: "",
			richBody: [{ type: "list", ordered: false, items: ["word ".repeat(201)] }],
		}),
	).toBe(2);
});

test("duplicate entity IDs/slugs and impossible experience dates are rejected", () => {
	const item = article(true);
	expect(draftSchema.safeParse({ ...emptyDraft("en"), articles: [item, item] }).success).toBe(
		false,
	);
	expect(
		draftSchema.safeParse({
			...emptyDraft("en"),
			articles: [item, { ...item, id: crypto.randomUUID() }],
		}).success,
	).toBe(false);
	const experience = {
		id: crypto.randomUUID(),
		organization: "Org",
		role: "Role",
		startDate: "2026-01-01",
		endDate: "2025-12-31",
		current: false,
		description: "",
	};
	expect(experienceSchema.safeParse(experience).success).toBe(false);
	expect(
		experienceSchema.safeParse({ ...experience, endDate: "2026-02-01", current: true }).success,
	).toBe(false);
	const skill = { id: crypto.randomUUID(), category: "Design", items: ["UI"] };
	expect(draftSchema.safeParse({ ...emptyDraft("en"), skills: [skill, skill] }).success).toBe(
		false,
	);
});

test("empty structured editor blocks preserve the plain body and its computed reading time", () => {
	const body = "word ".repeat(401);
	const richBody = [{ type: "paragraph" as const, text: "  \n " }];
	const draft = draftSchema.parse({
		...emptyDraft("en"),
		articles: [{ ...article(true), body, richBody }],
	});
	expect(draft.articles?.[0].body).toBe(body);
	expect(draft.articles?.[0].richBody).toEqual(richBody);
	expect(draft.articles?.[0].readTimeMinutes).toBe(3);
	expect(
		calculateReadTime({ body, richBody: [{ type: "paragraph", text: "real structured content" }] }),
	).toBe(1);
});
