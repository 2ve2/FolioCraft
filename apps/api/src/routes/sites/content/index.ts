import { Hono } from "hono";
import type { AuthEnv } from "../../../middleware/auth";
import { appearanceRoutes } from "./appearance";
import { articlesRoutes } from "./articles";
import { educationRoutes } from "./education";
import { experiencesRoutes } from "./experiences";
import { profileRoutes } from "./profile";
import { projectsRoutes } from "./projects";
import { sectionRoutes } from "./sections";
import { skillsRoutes } from "./skills";

// Composition only: each resource owns its validation and handlers in a separate module.
export const contentRoutes = new Hono<AuthEnv>();
contentRoutes.route("/profile", profileRoutes);
contentRoutes.route("/appearance", appearanceRoutes);
contentRoutes.route("/sections", sectionRoutes);
contentRoutes.route("/projects", projectsRoutes);
contentRoutes.route("/experiences", experiencesRoutes);
contentRoutes.route("/education", educationRoutes);
contentRoutes.route("/skills", skillsRoutes);
contentRoutes.route("/articles", articlesRoutes);
