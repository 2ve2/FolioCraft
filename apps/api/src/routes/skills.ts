import { skillSchema } from "@folio/contracts";
import { createCollectionRoutes } from "./collection-router";

/** Registers owned skills operations using the shared revision-aware protocol. */
export const skillsRoutes = createCollectionRoutes("skills", skillSchema);
