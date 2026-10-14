import type { NextConfig } from "next";

const config: NextConfig = {
	distDir: process.env.FOLIO_QA_BUILD === "1" ? ".next-qa" : ".next",
	transpilePackages: ["@folio/contracts", "@folio/portfolio"],
	poweredByHeader: false,
};
export default config;
