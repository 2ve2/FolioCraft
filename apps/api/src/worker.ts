import { isIP } from "node:net";
import app from "./app";
import { withRequestDatabase } from "./db";
import { type ImagesBinding, withImagesBinding } from "./lib/worker-images-context";

/** Derives the edge client address without trusting application-supplied proxy headers. */
export default {
	fetch(request: Request, bindings: { IMAGES?: ImagesBinding }) {
		const headers = new Headers(request.headers);
		const address = request.headers.get("cf-connecting-ip");
		headers.set("x-folio-client-ip", address && isIP(address) ? address : "unknown");
		return withRequestDatabase(() =>
			withImagesBinding(bindings.IMAGES, async () => app.fetch(new Request(request, { headers }))),
		);
	},
};
