import { projectSchema } from "@folio/contracts";
import { createCollectionRoutes } from "./collection-router";

/** Registers owned projects operations using the shared revision-aware protocol. */
export const projectsRoutes = createCollectionRoutes("projects", projectSchema);
