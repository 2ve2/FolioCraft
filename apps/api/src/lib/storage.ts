import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validateImageBytes } from "#image-validation";
import { ApiError } from "./response-helpers";
import { storageBucket, storageClient } from "./storage-client";

export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
export const UPLOAD_EXPIRY_SECONDS = 600;
export { validateImageBytes };

/** Converts provider errors into safe, stable domain failures while preserving intentional errors. */
function providerError(error: unknown, stage: string): never {
	const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
	// Never log provider messages, object keys, signed URLs or credentials.
	console.warn(
		JSON.stringify({
			event: "storage_provider_failure",
			stage,
			code: error instanceof ApiError ? error.code : null,
			kind: ["TypeError", "NoSuchKey", "AccessDenied", "TimeoutError"].includes(value.name ?? "")
				? value.name
				: "provider",
			status: value.$metadata?.httpStatusCode ?? null,
		}),
	);
	if (error instanceof ApiError) throw error;
	if (value.$metadata?.httpStatusCode === 404 || value.name === "NoSuchKey")
		throw new ApiError(409, "UPLOAD_NOT_FOUND");
	if (value.$metadata?.httpStatusCode === 412) throw new ApiError(409, "UPLOAD_CHANGED");
	throw new ApiError(502, "STORAGE_PROVIDER_ERROR");
}

export const storage = {
	/** Requires storage configuration before an upload lifecycle operation begins. */
	assertConfigured() {
		storageClient();
	},

	/** Signs a bounded staging upload with the expected content type and byte count. */
	async uploadUrl(key: string, mime: string, size: number) {
		try {
			return await getSignedUrl(
				storageClient(),
				new PutObjectCommand({
					Bucket: storageBucket(),
					Key: key,
					ContentType: mime,
					ContentLength: size,
				}),
				{ expiresIn: UPLOAD_EXPIRY_SECONDS, signableHeaders: new Set(["content-type"]) },
			);
		} catch (e) {
			return providerError(e, "upload-sign");
		}
	},

	/** Signs a short-lived private download with no-store response directives. */
	async downloadUrl(key: string) {
		try {
			return await getSignedUrl(
				storageClient(),
				new GetObjectCommand({
					Bucket: storageBucket(),
					Key: key,
					ResponseContentDisposition: "inline",
					ResponseCacheControl: "private, no-store",
				}),
				{ expiresIn: 60 },
			);
		} catch (e) {
			return providerError(e, "download-sign");
		}
	},

	/** Verifies uploaded metadata and image bytes, then conditionally copies the exact object to immutable storage. */
	async verifyAndCopy(stagingKey: string, key: string, mime: string, size: number) {
		let stage = "verify-head";
		try {
			const head = await storageClient().send(
				new HeadObjectCommand({ Bucket: storageBucket(), Key: stagingKey }),
			);
			if (
				head.ContentLength !== size ||
				size > MAX_ASSET_BYTES ||
				size < 1 ||
				head.ContentType !== mime ||
				!head.ETag
			)
				throw new ApiError(422, "UPLOAD_METADATA_MISMATCH");
			stage = "verify-read";
			const object = await storageClient().send(
				new GetObjectCommand({ Bucket: storageBucket(), Key: stagingKey, IfMatch: head.ETag }),
			);
			if (object.ContentLength !== size || object.ContentType !== mime || !object.Body)
				throw new ApiError(422, "UPLOAD_METADATA_MISMATCH");
			const chunks: Buffer[] = [];
			let length = 0;
			for await (const part of object.Body as AsyncIterable<Uint8Array>) {
				length += part.byteLength;
				if (length > size || length > MAX_ASSET_BYTES) {
					(object.Body as { destroy?: () => void }).destroy?.();
					throw new ApiError(422, "UPLOAD_SIZE_MISMATCH");
				}
				chunks.push(Buffer.from(part));
			}
			if (length !== size) throw new ApiError(422, "UPLOAD_SIZE_MISMATCH");
			const bytes = Buffer.concat(chunks);
			stage = "verify-image";
			const { width, height } = await validateImageBytes(bytes, mime);
			stage = "verify-copy";
			// Conditional server-side copy pins the exact bytes decoded above even if the signed PUT is replayed.
			await storageClient().send(
				new CopyObjectCommand({
					Bucket: storageBucket(),
					Key: key,
					CopySource: `${storageBucket()}/${stagingKey.split("/").map(encodeURIComponent).join("/")}`,
					CopySourceIfMatch: head.ETag,
					MetadataDirective: "REPLACE",
					ContentType: mime,
					ContentDisposition: "inline",
					CacheControl: "private, no-store",
				}),
			);
			return { width, height };
		} catch (e) {
			return providerError(e, stage);
		}
	},

	/** Deletes a private object and exposes provider failures for durable retries. */
	async delete(key: string) {
		try {
			await storageClient().send(new DeleteObjectCommand({ Bucket: storageBucket(), Key: key }));
		} catch (e) {
			providerError(e, "delete");
		}
	},
};
