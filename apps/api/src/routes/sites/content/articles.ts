import { articleInputSchema } from "@ichnara/contracts";
import { createCollectionRoutes } from "./shared/collection-router";

/** Registers owned articles operations using the shared revision-aware protocol. */
export const articlesRoutes = createCollectionRoutes("articles", articleInputSchema);
