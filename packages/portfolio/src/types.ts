import type { Draft } from "@ichnara/contracts";
import type { ReactNode } from "react";

/** Shared by the private preview and the immutable published release. */
export type PortfolioProps = {
	draft: Draft;
	compact?: boolean;
	assetUrls?: Record<string, string>;
	publicBasePath?: string;
	contactForm?: ReactNode;
	detail?: ReactNode;
	anchorPrefix?: string;
};
