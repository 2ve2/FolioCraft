/** Minimal official named-entrypoint surface; actual behavior is verified in workerd. */
declare module "cloudflare:workers" {
	export class WorkerEntrypoint<Env = unknown> {
		protected env: Env;
		protected ctx: { waitUntil(task: Promise<unknown>): void };
	}
}

/** OpenNext creates this module after the Next typecheck, including its DO exports. */
declare module "*.open-next/worker.js" {
	const handler: {
		fetch(
			request: Request,
			env: unknown,
			context: { waitUntil(task: Promise<unknown>): void },
		): Promise<Response>;
	};
	export default handler;
	export const DOQueueHandler: unknown;
	export const DOShardedTagCache: unknown;
}
