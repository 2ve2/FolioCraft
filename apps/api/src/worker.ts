import { isIP } from "node:net";
import app from "./app";

/** Derives the edge client address without trusting application-supplied proxy headers. */
export default {
	fetch(request: Request) {
		const headers = new Headers(request.headers);
		const address = request.headers.get("cf-connecting-ip");
		headers.set("x-folio-client-ip", address && isIP(address) ? address : "unknown");
		return app.fetch(new Request(request, { headers }));
	},
};
