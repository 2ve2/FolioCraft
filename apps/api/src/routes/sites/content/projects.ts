import { projectSchema } from "@ichnara/contracts";
import { createCollectionRoutes } from "./shared/collection-router";

/** Registers owned projects operations using the shared revision-aware protocol. */
export const projectsRoutes = createCollectionRoutes("projects", projectSchema);
