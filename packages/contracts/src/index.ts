import { z } from "zod";

export const localeSchema = z.enum(["ar", "en"]);
export const slugSchema = z
	.string()
	.trim()
	.min(3)
	.max(50)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const link = z.union([
	z.literal(""),
	z
		.url()
		.max(2000)
		.refine((value) => /^https?:\/\//.test(value)),
]);
const assetId = z.uuid().nullable().optional();

/** Builds a bounded text schema without changing the supplied content. */
const text = (max: number) => z.string().max(max);

/** Builds a required trimmed title schema with an explicit length limit. */
const title = (max: number) => z.string().trim().min(1).max(max);

export const richBlockSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("paragraph"), text: text(4000) }).strict(),
	z
		.object({
			type: z.literal("heading"),
			level: z.union([z.literal(2), z.literal(3)]),
			text: title(200),
		})
		.strict(),
	z
		.object({
			type: z.literal("list"),
			ordered: z.boolean(),
			items: z.array(title(1000)).min(1).max(30),
		})
		.strict(),
]);
export const richBodySchema = z
	.array(richBlockSchema)
	.max(100)
	.refine(
		(blocks) =>
			blocks.reduce(
				(count, block) =>
					count + (block.type === "list" ? block.items.join(" ").length : block.text.length),
				0,
			) <= 50000,
		"Rich text is too long",
	);
export type RichBlock = z.infer<typeof richBlockSchema>;
export const profileSchema = z.object({
	name: z.string().trim().max(100),
	role: z.string().trim().max(140),
	bio: text(3000),
	location: text(100),
	email: z.union([z.literal(""), z.email()]),
	website: link,
	available: z.boolean(),
	imageAssetId: assetId,
	socialLinks: z
		.array(
			z
				.object({
					label: title(50),
					url: z
						.url()
						.max(2000)
						.refine((value) => /^https?:\/\//.test(value)),
				})
				.strict(),
		)
		.max(10)
		.optional(),
});
export const projectSchema = z.object({
	id: z.uuid(),
	title: title(120),
	summary: text(700),
	body: text(12000),
	role: text(140),
	year: text(20),
	tools: text(300),
	url: link,
	slug: slugSchema.optional(),
	coverAssetId: assetId,
	galleryAssetIds: z
		.array(z.uuid())
		.max(12)
		.refine((ids) => new Set(ids).size === ids.length, "Duplicate gallery asset")
		.optional(),
	featured: z.boolean().optional(),
	richBody: richBodySchema.optional(),
	results: text(4000).optional(),
});
const date = z.iso.date();

/** Checks that a supplied date range is chronologically valid. */
const range = <T extends { startDate: string; endDate: string | null }>(value: T) =>
	value.endDate === null || value.endDate >= value.startDate;

export const experienceSchema = z
	.object({
		id: z.uuid(),
		organization: title(160),
		role: title(140),
		startDate: date,
		endDate: date.nullable(),
		current: z.boolean(),
		description: text(5000),
		accomplishments: z.array(title(700)).max(20).optional(),
	})
	.strict()
	.refine(range, "End date must not precede start date")
	.refine(
		(value) => !value.current || value.endDate === null,
		"Current experience must have no end date",
	);
export const educationSchema = z
	.object({
		id: z.uuid(),
		organization: title(160),
		qualification: title(180),
		startDate: date,
		endDate: date.nullable(),
		description: text(3000),
		verificationUrl: link,
		type: z.enum(["education", "certificate"]).optional(),
	})
	.strict()
	.refine(range, "End date must not precede start date");
export const skillSchema = z
	.object({ id: z.uuid(), category: title(100), items: z.array(title(100)).min(1).max(50) })
	.strict();
export const articleSchema = z
	.object({
		id: z.uuid(),
		slug: slugSchema,
		title: title(180),
		summary: text(700),
		body: text(50000),
		richBody: richBodySchema.optional(),
		coverAssetId: assetId,
		published: z.boolean(),
		readTimeMinutes: z.number().int().min(1).max(1000).optional(),
	})
	.strict();
export const articleInputSchema = articleSchema.omit({ readTimeMinutes: true });
export type Article = z.infer<typeof articleSchema>;

/** Empty editor blocks do not replace existing plain text until real structured content exists. */
export function hasRichContent(blocks?: RichBlock[]): boolean {
	return Boolean(
		blocks?.some((block) =>
			block.type === "list"
				? block.items.some((item) => item.trim().length > 0)
				: block.text.trim().length > 0,
		),
	);
}

/** Computes reading time from the article text that will actually render. */
export function calculateReadTime(article: Pick<Article, "body" | "richBody">): number {
	const content = hasRichContent(article.richBody)
		? (article.richBody ?? [])
				.map((block) => (block.type === "list" ? block.items.join(" ") : block.text))
				.join(" ")
		: article.body;
	return Math.max(1, Math.ceil(content.trim().split(/\s+/u).filter(Boolean).length / 200));
}

export const sectionVisibilitySchema = z
	.object({
		projects: z.boolean().optional(),
		experiences: z.boolean().optional(),
		education: z.boolean().optional(),
		skills: z.boolean().optional(),
		articles: z.boolean().optional(),
		contact: z.boolean().optional(),
	})
	.strict();
export const appearanceSchema = z.object({
	theme: z.enum(["light", "dark", "editorial"]),
	font: z.enum(["sans", "serif", "mono"]),
	size: z.enum(["small", "medium", "large"]),
	accent: z.enum(["violet", "blue", "green", "rose"]),
	projectsVisible: z.boolean(),
	profileVisualVisible: z.boolean().optional(),
	projectFallbackVisible: z.boolean().optional(),
});

/** Rejects duplicate identities inside a content collection. */
const uniqueIds = (items: { id: string }[]) =>
	new Set(items.map((item) => item.id)).size === items.length;

/** Rejects duplicate non-empty detail addresses inside a content collection. */
const uniqueSlugs = (items: { slug?: string }[]) => {
	const values = items.flatMap((item) => (item.slug ? [item.slug] : []));
	return new Set(values).size === values.length;
};

export const draftSchema = z
	.object({
		schemaVersion: z.literal(1),
		locale: localeSchema,
		profile: profileSchema,
		projects: z
			.array(projectSchema)
			.max(30)
			.refine(uniqueIds, "Duplicate project IDs")
			.refine(uniqueSlugs, "Duplicate project slugs"),
		appearance: appearanceSchema,
		experiences: z
			.array(experienceSchema)
			.max(50)
			.refine(uniqueIds, "Duplicate experience IDs")
			.optional(),
		education: z
			.array(educationSchema)
			.max(50)
			.refine(uniqueIds, "Duplicate education IDs")
			.optional(),
		skills: z.array(skillSchema).max(30).refine(uniqueIds, "Duplicate skill IDs").optional(),
		articles: z
			.array(articleSchema)
			.max(100)
			.refine(uniqueIds, "Duplicate article IDs")
			.refine(uniqueSlugs, "Duplicate article slugs")
			.optional(),
		sectionVisibility: sectionVisibilitySchema.optional(),
	})
	.transform((draft) =>
		draft.articles === undefined
			? draft
			: {
					...draft,
					articles: draft.articles.map((article) => ({
						...article,
						readTimeMinutes: calculateReadTime(article),
					})),
				},
	)
	.refine(
		(draft) => new TextEncoder().encode(JSON.stringify(draft)).byteLength <= 900_000,
		"Portfolio exceeds the total content size limit",
	);
export type Draft = z.infer<typeof draftSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type Site = {
	id: string;
	slug: string;
	revision: number;
	publishedReleaseId: string | null;
	draft: Draft;
};
export type PublicSite = { slug: string; releaseId: string; publishedAt: string; draft: Draft };

/** Collects all referenced image identities for ownership and retention checks. */
export function collectAssetIds(draft: Draft): string[] {
	return [
		...new Set([
			...(draft.profile.imageAssetId ? [draft.profile.imageAssetId] : []),
			...draft.projects.flatMap((project) => [
				...(project.coverAssetId ? [project.coverAssetId] : []),
				...(project.galleryAssetIds ?? []),
			]),
			...(draft.articles ?? []).flatMap((article) =>
				article.coverAssetId ? [article.coverAssetId] : [],
			),
		]),
	];
}

/** Projects only the draft content eligible for the published release. */
export function publishedDraft(draft: Draft): Draft {
	const visibility = draft.sectionVisibility;
	const result: Draft = {
		...draft,
		profile: { ...draft.profile },
		projects:
			draft.appearance.projectsVisible && visibility?.projects !== false ? draft.projects : [],
	};
	if (draft.experiences !== undefined)
		result.experiences = visibility?.experiences === false ? [] : draft.experiences;
	if (draft.education !== undefined)
		result.education = visibility?.education === false ? [] : draft.education;
	if (draft.skills !== undefined) result.skills = visibility?.skills === false ? [] : draft.skills;
	if (draft.articles !== undefined)
		result.articles =
			visibility?.articles === false
				? []
				: draft.articles
						.filter((article) => article.published)
						.map((article) => ({ ...article, readTimeMinutes: calculateReadTime(article) }));
	if (visibility?.contact === false) {
		result.profile.email = "";
		result.profile.website = "";
		if (draft.profile.socialLinks !== undefined) result.profile.socialLinks = [];
	}
	return result;
}

export const createSiteSchema = z.object({ slug: slugSchema, locale: localeSchema });
export const saveSchema = z.object({ revision: z.number().int().min(0), draft: draftSchema });
export const publishSchema = z.object({ revision: z.number().int().min(0) });

/** Creates the initial fixed-layout draft for the chosen content language. */
export const emptyDraft = (locale: Locale): Draft => ({
	schemaVersion: 1,
	locale,
	profile: { name: "", role: "", bio: "", location: "", email: "", website: "", available: false },
	projects: [],
	appearance: {
		theme: "light",
		font: "sans",
		size: "medium",
		accent: "violet",
		projectsVisible: true,
	},
});

export * from "./reports";
