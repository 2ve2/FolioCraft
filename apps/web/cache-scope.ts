import type { AsyncLocalStorage } from "node:async_hooks";

const key = Symbol.for("ichnara.portfolio.render-start");
const globals = globalThis as unknown as Record<symbol, AsyncLocalStorage<number>>;

/** Never substitutes upload time for the time at which the public snapshot could first be read. */
export function portfolioRenderStart() {
	return globals[key]?.getStore();
}
