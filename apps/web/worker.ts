// biome-ignore lint/suspicious/noTsIgnore: OpenNext creates the module after typechecking.
// @ts-ignore OpenNext generates this module during build:cloudflare.
import handler from "./.open-next/worker.js";
import { monitorWeb } from "./monitoring";

// Preserve OpenNext's generated Durable Object exports.
// biome-ignore lint/suspicious/noTsIgnore: OpenNext creates the module after typechecking.
// @ts-ignore OpenNext generates this module during build:cloudflare.
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

/** Keeps the generated OpenNext handler untouched when the secret is absent. */
export default monitorWeb(handler);
