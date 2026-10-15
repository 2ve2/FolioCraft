import type { MetadataRoute } from "next";
import { webOrigin } from "../lib/public-metadata";

/** Keeps the trial application out of crawler indexes. */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: "/admin" },
		sitemap: `${webOrigin}/sitemap.xml`,
	};
}
