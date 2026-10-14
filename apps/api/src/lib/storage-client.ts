import { S3Client } from "@aws-sdk/client-s3";
import { env, storageConfigured } from "../config/env";
import { ApiError } from "./response-helpers";

const client = storageConfigured
	? new S3Client({
			region: "auto",
			maxAttempts: 2,
			requestHandler: { requestTimeout: 10000, connectionTimeout: 5000 },
			endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
				secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
			},
			requestChecksumCalculation: "WHEN_REQUIRED",
			responseChecksumValidation: "WHEN_REQUIRED",
			forcePathStyle: true,
		})
	: undefined;

/** Returns the shared private storage client or rejects an unconfigured integration. */
export function storageClient() {
	if (!client) throw new ApiError(503, "STORAGE_UNAVAILABLE");
	return client;
}

/** Returns the configured private bucket without exposing provider credentials. */
export function storageBucket() {
	if (!env.R2_BUCKET) throw new ApiError(503, "STORAGE_UNAVAILABLE");
	return env.R2_BUCKET;
}
