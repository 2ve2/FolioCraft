import { slugSchema } from "@ichnara/contracts";
import { Hono } from "hono";
import { ApiError, successResponse } from "../../lib/response-helpers";
import { publicSiteService } from "../../services/sites/public-service";

export const publicSites = new Hono();

/** Reads the accessible published release for a portfolio address. */
publicSites.get("/:slug", async (c) => {
	const slug = slugSchema.safeParse(c.req.param("slug"));
	if (!slug.success) throw new ApiError(404, "NOT_FOUND");
	return successResponse(c, await publicSiteService.public(slug.data));
});

/** Reads a project belonging to the accessible published release. */
publicSites.get("/:slug/projects/:projectId", async (c) => {
	const site = await publicSiteService.public(slugSchema.parse(c.req.param("slug")));
	const requested = c.req.param("projectId");
	const value =
		site.draft.projects.find((project) => project.id === requested) ??
		site.draft.projects.find((project) => project.slug === requested);
	if (!value) throw new ApiError(404, "NOT_FOUND");
	return successResponse(c, { releaseId: site.releaseId, project: value });
});

/** Reads a public article belonging to the accessible published release. */
publicSites.get("/:slug/articles/:articleSlug", async (c) => {
	const site = await publicSiteService.public(slugSchema.parse(c.req.param("slug")));
	const value = site.draft.articles?.find((article) => article.slug === c.req.param("articleSlug"));
	if (!value) throw new ApiError(404, "NOT_FOUND");
	return successResponse(c, { releaseId: site.releaseId, article: value });
});
