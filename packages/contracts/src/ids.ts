import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

/** Creates the collision-resistant, URL-safe identifier used for every new record and content item. */
export const newId = (): string => createId();

/** Platform cuid2 identifiers: 24 lowercase base-36 characters starting with a letter. */
const cuidPattern = /^[a-z][0-9a-z]{23}$/;

/**
 * Accepts new cuid2 identifiers and the UUIDs issued before their adoption, which remain
 * valid inside existing rows, drafts and immutable release snapshots.
 */
export const idSchema = z.union([z.string().regex(cuidPattern), z.uuid()]);
