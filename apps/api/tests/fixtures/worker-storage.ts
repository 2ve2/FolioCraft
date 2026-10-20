import { CopyObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

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

const listCases = [
	{
		name: "list-success",
		status: 200,
		xml: "<ListBucketResult><Name>fixture-bucket</Name><Prefix>verified/site/</Prefix><KeyCount>2</KeyCount><MaxKeys>100</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>verified/site/a</Key><Size>1</Size></Contents><Contents><Key>verified/site/b</Key><Size>2</Size></Contents></ListBucketResult>",
		keys: ["verified/site/a", "verified/site/b"],
	},
	{
		name: "list-permission",
		status: 403,
		xml: "<Error><Code>AccessDenied</Code><Message>Fixture denial</Message></Error>",
		keys: null,
	},
];

/** Builds an SDK client whose transport returns one synthetic XML response. */
function syntheticClient(status: number, xml: string) {
	return new S3Client({
		region: "auto",
		endpoint: "https://storage.invalid",
		credentials: { accessKeyId: "synthetic", secretAccessKey: "synthetic-test-only" },
		maxAttempts: 1,
		forcePathStyle: true,
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
		requestHandler: {
			async handle() {
				return {
					response: {
						statusCode: status,
						headers: { "content-type": "application/xml" },
						body: new Blob([xml]).stream(),
					},
				};
			},
		},
	});
}

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
		// Scheduled R2 cleanup lists keys under a prefix; its XML must parse without DOMParser too.
		for (const listing of listCases) {
			const client = syntheticClient(listing.status, listing.xml);
			let keys: string[] | null = null;
			try {
				const page = await client.send(
					new ListObjectsV2Command({
						Bucket: "fixture-bucket",
						Prefix: "verified/site/",
						MaxKeys: 100,
					}),
				);
				keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : []));
			} catch {
				keys = null;
			} finally {
				client.destroy();
			}
			results.push({
				name: listing.name,
				pass: JSON.stringify(keys) === JSON.stringify(listing.keys),
			});
		}
		return Response.json({ domParserAbsent: !("DOMParser" in globalThis), results });
	},
};
