import { educationSchema } from "@folio/contracts";
import { createCollectionRoutes } from "./collection-router";

/** Registers owned education operations using the shared revision-aware protocol. */
export const educationRoutes = createCollectionRoutes("education", educationSchema);
