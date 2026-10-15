import { ApiError } from "../response-helpers";
import { currentImagesBinding } from "./worker-images-context";

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 16_777_216;

/** Rejects animated PNG/WebP containers before requesting a full remote decode. */
function rejectMultipleFrames(bytes: Buffer, format: string) {
	if (format === "png") {
		for (let offset = 8; offset + 12 <= bytes.length; ) {
			const length = bytes.readUInt32BE(offset);
			if (offset + length + 12 > bytes.length) throw new Error("Truncated PNG chunk");
			if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") {
				if (length !== 8 || bytes.readUInt32BE(offset + 8) > 1)
					throw new Error("Multiple image frames");
			}
			offset += length + 12;
		}
	}
	if (format === "webp") {
		for (let offset = 12; offset + 8 <= bytes.length; ) {
			const length = bytes.readUInt32LE(offset + 4);
			if (offset + length + 8 > bytes.length) throw new Error("Truncated WebP chunk");
			const name = bytes.toString("ascii", offset, offset + 4);
			if (name === "ANIM" || name === "ANMF") throw new Error("Animated image");
			offset += length + 8 + (length % 2);
		}
	}
}

/** Uses Cloudflare's decoder without exposing private bytes or replacing the verified original. */
export async function validateImageBytes(
	bytes: Buffer,
	mime: string,
): Promise<{ width: number; height: number }> {
	if (bytes.length < 1 || bytes.length > MAX_ASSET_BYTES)
		throw new ApiError(422, "UPLOAD_SIZE_MISMATCH");
	const images = currentImagesBinding();
	if (!images) throw new ApiError(503, "STORAGE_UNAVAILABLE");

	/** Creates a fresh bounded byte stream for each decoder operation. */
	const stream = () => new Blob([new Uint8Array(bytes)]).stream();

	try {
		const meta = await images.info(stream());
		const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[mime];
		const format = meta.format.replace(/^image\//, "").replace(/^jpg$/, "jpeg");
		if (
			!expected ||
			format !== expected ||
			!Number.isInteger(meta.width) ||
			!Number.isInteger(meta.height) ||
			meta.width < 1 ||
			meta.height < 1 ||
			meta.width > 4096 ||
			meta.height > 4096 ||
			meta.width * meta.height > MAX_PIXELS
		)
			throw new Error("Unsupported image dimensions/type");
		rejectMultipleFrames(bytes, format);
		// Consume a generated one-pixel image to force decoding; metadata alone is insufficient.
		const decoded = await images
			.input(stream())
			.transform({ width: 1, height: 1 })
			.output({ format: "image/png" });
		const response = decoded.response();
		if (!response.ok || !response.body) throw new Error("Image decoding failed");
		const reader = response.body.getReader();
		let outputBytes = 0;
		try {
			for (;;) {
				const part = await reader.read();
				if (part.done) break;
				outputBytes += part.value.byteLength;
				if (outputBytes > MAX_ASSET_BYTES) {
					await reader.cancel();
					throw new Error("Unexpected decoder output size");
				}
			}
		} finally {
			reader.releaseLock();
		}
		if (!outputBytes) throw new Error("Empty decoder output");
		return { width: meta.width, height: meta.height };
	} catch (error) {
		if (String(error).includes("9422")) throw new ApiError(502, "STORAGE_PROVIDER_ERROR");
		throw new ApiError(422, "INVALID_IMAGE");
	}
}
