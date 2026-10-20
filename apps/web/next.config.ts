import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const config: NextConfig = {
	distDir: process.env.FOLIO_QA_BUILD === "1" ? ".next-qa" : ".next",
	transpilePackages: ["@ichnara/contracts", "@ichnara/portfolio"],
	poweredByHeader: false,
	// Two root layouts (platform and published portfolio) need one branded page for unmatched URLs.
	experimental: { globalNotFound: true },
	/** Applies the shared security policy to every route, including static and public pages. */
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders({
					apiOrigin: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
					webOrigin: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
					development: process.env.NODE_ENV !== "production",
				}),
			},
		];
	},
	/** Keeps existing brand-kit links working without storing a duplicate archive. */
	async redirects() {
		return [
			{
				source: "/brand/ichnara/ichnara-brand-kit-v1.1.zip",
				destination: "/brand/ichnara/ichnara-brand-kit-v1.2.zip",
				permanent: true,
			},
			{
				source: "/brand/ichnara/ichnara-brand-kit-v1.zip",
				destination: "/brand/ichnara/ichnara-brand-kit-v1.2.zip",
				permanent: true,
			},
		];
	},
};
export default config;
