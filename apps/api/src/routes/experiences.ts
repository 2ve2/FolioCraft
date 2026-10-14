import { experienceSchema } from "@folio/contracts";
import { createCollectionRoutes } from "./collection-router";

/** Registers owned experiences operations using the shared revision-aware protocol. */
export const experiencesRoutes = createCollectionRoutes("experiences", experienceSchema);
