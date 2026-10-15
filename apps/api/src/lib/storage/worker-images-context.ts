import { AsyncLocalStorage } from "node:async_hooks";

export type ImagesBinding = {
	info(stream: ReadableStream<Uint8Array>): Promise<{
		format: string;
		width: number;
		height: number;
	}>;
	input(stream: ReadableStream<Uint8Array>): {
		transform(options: { width: number; height: number }): {
			output(options: { format: "image/png" }): Promise<{ response(): Response }>;
		};
	};
};
const imagesContext = new AsyncLocalStorage<ImagesBinding | undefined>();

/** Keeps non-serializable Cloudflare image capabilities within their originating request. */
export function withImagesBinding<T>(binding: ImagesBinding | undefined, operation: () => T): T {
	return imagesContext.run(binding, operation);
}

/** Reads the current request's image decoder without global mutation. */
export function currentImagesBinding() {
	return imagesContext.getStore();
}
