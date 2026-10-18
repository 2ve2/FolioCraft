import { skillSchema } from "@ichnara/contracts";
import { createCollectionRoutes } from "./shared/collection-router";

/** Registers owned skills operations using the shared revision-aware protocol. */
export const skillsRoutes = createCollectionRoutes("skills", skillSchema);
