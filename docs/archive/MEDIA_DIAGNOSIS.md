# Hosted media diagnosis — local preparation

Date: 2026-10-18. No deployment or hosted object/account operation was performed. Last hosted result remains intent200, PUT200, completion502 STORAGE_PROVIDER_ERROR. Its cause is unknown.

## Source trace and hypotheses

Owned completion locks the site/asset, checks pending state/expiry, HEADs staging metadata, conditionally reads the same ETag, checks byte length, decodes through Images, conditionally copies identical bytes and only then marks ready. No ownership/origin/CORS/rate-limit change is needed.

- **Images entitlement, limit or outage:** plausible at verify-image. Previously only9422 was recognized; all other exceptions became INVALID_IMAGE. Local fix distinguishes intentional validation failures from service errors; logs contain only phase, stable domain code and numeric provider code. Official reference describes9422 usage limit,9432 legacy binding billing,9529 timeout and9424/9516–9518 internal errors. These are candidate interpretations, not an observed hosted code: https://developers.cloudflare.com/images/reference/troubleshooting/ . No upgrade/purchase assumed.
- **Request-local binding:** worker wraps Hono in AsyncLocalStorage. Missing IMAGES returns503 and a binding-stage diagnostic. Concurrent/await regression proves local scope isolation; deployed configuration still needs inspection.
- **Provider read/copy/signing:** existing storage_provider_failure records upload-sign, verify-head, verify-read, verify-image or verify-copy without keys/URLs/messages. HEAD/GET404 maps to UPLOAD_NOT_FOUND; conditional412 to UPLOAD_CHANGED. Copy permissions, exact ETag and signed endpoint compatibility require live proof; no speculative signing change made.
- **Timeout:** S3 requests use10s request/5s connect deadlines and max2 attempts; DB statement/client deadlines remain separate. Images errors and failed/empty decode responses are provider failures. No arbitrary timeout or retry policy added without hosted timing evidence. Service exceptions can be distinguished by image stage but an abrupt Worker termination may require platform logs.
- **Size:**5MiB and4096px bounds remain. Local tests cover oversize bytes/dimensions; historical local decoder tests cover real PNG/JPEG/WebP and corrupt inputs.
- **CORS:** browser PUT requires allowed exact web origin, Content-Type and exposed ETag. Recorded PUT200 makes CORS a weaker explanation for subsequent server-to-server completion502; it is not proof of every client's CORS configuration. Never relax CORS globally.

## Exact operator procedure after separate deployment authorization

1. From the independent checkout, install the frozen lockfile and review apps/api/wrangler.toml. Preserve Worker name/URLs/Secrets/IMAGES. Confirm current environment and plan in the dashboard without changing billing.
2. Only after deployment authorization, run `bunx --no-install wrangler deploy --config apps/api/wrangler.toml`. This updates source diagnostics on the existing API; it is not needed/permitted during local preparation. API before web for any compatible additive fields.
3. Start `bunx --no-install wrangler tail --config apps/api/wrangler.toml --format json` privately. Use one human-authorized disposable test account and a small generated PNG. In the browser inspect only intent/PUT/complete statuses and the completion request ID; do not export cookies, signed URLs, bodies or credentials into Git.
4. Correlate the completion time and request ID with request_failed/storage_provider_failure/image_validation_failure. Capture stage, domain code, numeric providerCode, status, timing and platform termination category only. Image logs and storage logs belong to the same bounded request; do not infer from unrelated concurrent events.
5. For binding failure inspect IMAGES configuration. For numeric Images errors use the official reference and actual account entitlements. For verify-head/read/copy inspect permissions/ETag/endpoint privately. For browser PUT failure inspect exact CORS origin and signature, not the authenticated completion handler.
6. Acceptance requires ready metadata, owned preview, publication, decoded public image, delete/reference protections and exact fixture cleanup. Delete only explicitly authorized disposable objects/accounts. Retained releases intentionally protect referenced media. Do not mark hosted media fixed from diagnostics alone.

Local fake-binding tests prove error mapping/redaction/scope only. They do not simulate Cloudflare billing, network behavior or the actual hosted failure.
