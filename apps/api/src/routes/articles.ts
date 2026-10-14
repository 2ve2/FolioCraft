import { articleInputSchema } from "@folio/contracts";
import { createCollectionRoutes } from "./collection-router";

/** Registers owned articles operations using the shared revision-aware protocol. */
export const articlesRoutes = createCollectionRoutes("articles", articleInputSchema);
