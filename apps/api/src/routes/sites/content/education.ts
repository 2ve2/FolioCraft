import { educationSchema } from "@ichnara/contracts";
import { createCollectionRoutes } from "./shared/collection-router";

/** Registers owned education operations using the shared revision-aware protocol. */
export const educationRoutes = createCollectionRoutes("education", educationSchema);
