import sharp from "sharp";
import { ApiError } from "../response-helpers";

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 16_777_216;

/** Fully decodes a bounded supported image before its bytes can enter verified storage. */
export async function validateImageBytes(
	bytes: Buffer,
	mime: string,
): Promise<{ width: number; height: number }> {
	if (bytes.length < 1 || bytes.length > MAX_ASSET_BYTES)
		throw new ApiError(422, "UPLOAD_SIZE_MISMATCH");
	try {
		const image = sharp(bytes, {
			limitInputPixels: MAX_PIXELS,
			failOn: "warning",
			animated: false,
		});
		const meta = await image.metadata();
		const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[mime];
		if (
			!expected ||
			meta.format !== expected ||
			!meta.width ||
			!meta.height ||
			meta.width > 4096 ||
			meta.height > 4096 ||
			meta.width * meta.height > MAX_PIXELS ||
			(meta.pages ?? 1) > 1
		)
			throw new Error("Unsupported image dimensions/type");
		await image.stats(); // Force decoding: metadata alone can accept a truncated image.
		return { width: meta.width, height: meta.height };
	} catch {
		throw new ApiError(422, "INVALID_IMAGE");
	}
}
