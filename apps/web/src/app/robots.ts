import type { MetadataRoute } from "next";
import { webOrigin } from "../lib/public-metadata";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: "/admin" },
		sitemap: `${webOrigin}/sitemap.xml`,
	};
}
