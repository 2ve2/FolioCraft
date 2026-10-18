import type { NextConfig } from "next";

const config: NextConfig = {
	distDir: process.env.FOLIO_QA_BUILD === "1" ? ".next-qa" : ".next",
	transpilePackages: ["@ichnara/contracts", "@ichnara/portfolio"],
	poweredByHeader: false,
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
