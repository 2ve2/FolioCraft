import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";

const sourceEtag = '"fixture-source"';
const cases = [
	{
		name: "success",
		status: 200,
		xml: '<CopyObjectResult><ETag>"fixture-copy"</ETag><LastModified>2026-10-20T00:00:00.000Z</LastModified></CopyObjectResult>',
		error: false,
	},
	{
		name: "permission",
		status: 403,
		xml: "<Error><Code>AccessDenied</Code><Message>Fixture denial</Message></Error>",
		error: true,
	},
	{
		name: "changed-source",
		status: 412,
		xml: "<Error><Code>PreconditionFailed</Code><Message>Fixture source changed</Message></Error>",
		error: true,
	},
	{
		name: "embedded-error",
		status: 200,
		xml: "<Error><Code>InternalError</Code><Message>Fixture copy failed</Message></Error>",
		error: true,
	},
	{ name: "malformed", status: 200, xml: "<CopyObjectResult><ETag>unfinished", error: true },
	{ name: "empty", status: 200, xml: "", error: true },
];

/** Exercises the actual Workers bundle with synthetic SDK responses, never a provider or database. */
export default {
	async fetch() {
		const results = [];
		for (const fixture of cases) {
			let conditional = false;
			const client = new S3Client({
				region: "auto",
				endpoint: "https://storage.invalid",
				credentials: { accessKeyId: "synthetic", secretAccessKey: "synthetic-test-only" },
				maxAttempts: 1,
				forcePathStyle: true,
				requestChecksumCalculation: "WHEN_REQUIRED",
				responseChecksumValidation: "WHEN_REQUIRED",
				requestHandler: {
					async handle(request: { headers: Record<string, string> }) {
						conditional = request.headers["x-amz-copy-source-if-match"] === sourceEtag;
						return {
							response: {
								statusCode: fixture.status,
								headers: { "content-type": "application/xml" },
								body: new Blob([fixture.xml]).stream(),
							},
						};
					},
				},
			});
			let failed = false;
			let correctResult = false;
			try {
				const result = await client.send(
					new CopyObjectCommand({
						Bucket: "fixture-bucket",
						Key: "verified/fixture.png",
						CopySource: "fixture-bucket/staging/fixture.png",
						CopySourceIfMatch: sourceEtag,
						MetadataDirective: "REPLACE",
						ContentType: "image/png",
						ContentDisposition: "inline",
						CacheControl: "private, no-store",
					}),
				);
				correctResult =
					result.CopyObjectResult?.ETag === '"fixture-copy"' &&
					result.CopyObjectResult.LastModified instanceof Date;
			} catch {
				failed = true;
			} finally {
				client.destroy();
			}
			results.push({
				name: fixture.name,
				pass: conditional && failed === fixture.error && (failed || correctResult),
			});
		}
		return Response.json({ domParserAbsent: !("DOMParser" in globalThis), results });
	},
};
