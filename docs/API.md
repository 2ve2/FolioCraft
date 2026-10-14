# Current API reference

Last reviewed: 2026-10-13, Asia/Riyadh. This file describes current code, not proposed endpoints. The independent backend lives in `apps/api`; content contracts are in `packages/contracts/src/index.ts`. Check and integration status are in `STATUS.md`.

## Connection rules

- Development URL: `http://localhost:4000`. Domain endpoint prefix: `/api`.
- The frontend sends the session cookie using `credentials: "include"`. Public reads do not require a session.
- Every write under `/api/*`, including public inquiries, requires `Origin` to exactly match `WEB_URL`. A missing header is rejected with `403 INVALID_ORIGIN`. CORS allows only that origin with credentials.
- Every private operation checks the Better Auth session and site ownership. A body `ownerId` grants no authority. Missing or unowned sites/items return `404 NOT_FOUND`.
- Production requires verified email; an unverified session returns `403 EMAIL_NOT_VERIFIED`.
- Send JSON with `Content-Type: application/json`. The `/api/*` body limit is1,048,576 bytes (1 MiB); the Bun server limit is1,100,000 bytes. The serialized draft aggregate is limited to900,000 UTF-8 bytes; the sum of every field maximum cannot necessarily fit in a single request.
- `/api/*` responses use `Cache-Control: no-store`. CORS exposes `X-Request-Id` and `Retry-After` to the frontend.

Domain API success:

```json
{"status":true,"result":{}}
```

Domain API failure:

```json
{"status":false,"code":"REVISION_CONFLICT","error":"REVISION_CONFLICT"}
```

Validation returns `400 VALIDATION_ERROR` with Zod `fields`. Use `code` for user-facing translations rather than relying on the wording of `error`.

**Exception:** `/api/auth/*` retains the native Better Auth protocol; do not wrap it in the domain envelope. `/health` and `/ready` use separate operational response shapes; successful public asset delivery returns a `302` redirect.

## Authentication and operation

| Method and path | Actual behavior |
|---|---|
| `POST /api/auth/sign-up/email` | Better Auth; example `{ "name":"Account name", "email":"person@example.com", "password":"a-long-password" }`; password minimum10 characters |
| `POST /api/auth/sign-in/email` | Better Auth; `{ "email":"person@example.com", "password":"a-long-password" }` |
| `GET /api/auth/get-session` | Read the session using the Better Auth protocol |
| `POST /api/auth/sign-out` | End the session |
| `POST /api/auth/send-verification-email` | Verification message; use the Better Auth client and native contract |
| `GET /api/auth/verify-email` | Service-issued verification link; do not create a token manually |
| `POST /api/auth/request-password-reset` | Request a password-reset link through Better Auth |
| `POST /api/auth/reset-password` | Reset token and new password through Better Auth; revokes previous sessions |
| `GET /api/me` | Private; `{id,name,email,emailVerified}` inside `result` |
| `GET /health` | Process liveness only; `{status:true}` |
| `GET /ready` | Runs `select 1`; reports `integrations.storage/mail` as `configured` or `disabled`, not an upload/delivery test |

Normal production registration sends verification and does not issue an immediately usable session. The human-authorized hosted trial explicitly sets TRIAL_SKIP_EMAIL_VERIFICATION=true, permitting immediate signup/sign-in without mail; the flag defaultsfalse. Verification does not automatically sign in; the user then signs in. Development permits unverified sign-in for the local flow. Missing mail configuration returns `503 MAIL_UNAVAILABLE` for mail-dependent operations; SMTP failure returns `MAIL_DELIVERY_FAILED`. Production startup requires HTTPS origins and complete SMTP configuration unless the explicit trial skip is enabled. Reset/resend still report unavailable mail when no transport exists; see [CLOUDFLARE.md](CLOUDFLARE.md) for the current trial exception.

Better Auth limits are database-backed: general window100 requests/60 seconds; sign-in10, and sign-up, reset requests, and verification resends5 each/60 seconds. Private domain writes allow120 per user/60 seconds. `429` can include `Retry-After`.

## Sites, drafts, and releases

Private `Site`: `{id,slug,revision,publishedReleaseId,draft}`. Currently one site per account. Globally unique `slug` is3–50 lowercase Latin letters/digits with separator hyphens.

| Method and path | Request / result |
|---|---|
| `GET /api/sites` | Owned site or `null` |
| `POST /api/sites` | `{slug,locale:"ar"|"en"}`; creates an empty draft and returns `Site` |
| `GET /api/sites/:id` | Owned `Site` |
| `GET /api/sites/:id/preview` | `Site` with the private draft |
| `PATCH /api/sites/:id` | `{revision,slug?,locale?}`; at least one optional field required; returns `Site` |
| `PUT /api/sites/:id/draft` | `{revision,draft}`; saves the full aggregate and returns `Site` |
| `POST /api/sites/:id/releases` | `{revision}`; publishes and returns release `{id,revision}` |
| `GET /api/sites/:id/releases?limit=20&offset=0` | `{items,hasMore,limit,offset}`; each item `{id,revision,createdAt,active}` |
| `GET /api/sites/:id/releases/:releaseId` | Private; `{id,revision,createdAt,snapshot}` |
| `POST /api/sites/:id/releases/:releaseId/activate` | `{expectedReleaseId:UUID|null}`; activates an owned release and returns `Site` |
| `POST /api/sites/:id/unpublish` | No body required; removes the public pointer while retaining draft and releases |

Saving and content/settings changes lock the site row and compare `revision` inside a PostgreSQL transaction. A stale revision returns `409 REVISION_CONFLICT` without writing; success increments the revision. Do not automatically resend stale content over a newer version. Retain local edits, then load the latest version or merge deliberately. Unsaved local changes are not proof of persistence.

Publication requires a name and discipline/role. It creates an immutable public-filtered snapshot and updates the release pointer in the same transaction; publishing the same revision reuses its existing release. Activating a prior release compares `expectedReleaseId` with the current pointer and returns `409 PUBLICATION_CONFLICT` on mismatch; it does not replace the draft. Unpublishing currently neither uses nor increments `revision`. Changing `slug` changes the public URL without redirecting the old URL.

`limit`:1–100, default20. `offset`:0–10,000, default0. These bounds apply to release history and the inquiry inbox. Content collections have size limits and return complete arrays without pagination.

## Profile, appearance, and sections

| Method and path | Shape |
|---|---|
| `GET /api/sites/:id/profile` | `{revision,profile}` |
| `PATCH /api/sites/:id/profile` | `{revision,profile:partial}`; returns `Site` |
| `GET /api/sites/:id/appearance` | `{revision,appearance}` |
| `PATCH /api/sites/:id/appearance` | `{revision,appearance:partial}`; returns `Site` |
| `GET /api/sites/:id/sections` | `{revision,sections}` |
| `PATCH /api/sites/:id/sections` | `{revision,sections:partial}`; returns `Site` |

Empty patches and unknown fields are rejected. Public profile email is separate from login email; `profile.email` appears only when the site owner enters it for publication.

- `profile`: `name` ≤100, `role` ≤140, `bio` ≤3000, `location` ≤100, valid or empty `email`, HTTP(S) or empty `website`, boolean `available`. Optional `imageAssetId: UUID|null` and `socialLinks: [{label,url}]` with at most10 links, nonempty label ≤50, and HTTP(S) URL.
- `appearance`: `theme:light|dark|editorial`, `font:sans|serif|mono`, `size:small|medium|large`, `accent:violet|blue|green|rose`, `projectsVisible:boolean`. Appearance changes do not change content.
- `sections`: optional booleans for `projects,experiences,education,skills,articles,contact`. Section/appearance PATCH synchronizes project visibility between the legacy and new fields.

Example profile update:

```json
{"revision":3,"profile":{"bio":"A designer helping teams build clear experiences.","imageAssetId":null}}
```

## Content CRUD and ordering

The following pattern applies to `projects`, `experiences`, `education`, `skills`, and `articles`:

| Method and path | Shape |
|---|---|
| `GET /api/sites/:id/:collection` | `{revision,items}`; absent optional collections return an empty array |
| `GET /api/sites/:id/:collection/:itemId` | `{revision,item}` |
| `POST /api/sites/:id/:collection` | `{revision,item:full}`; item UUID required; returns `Site` |
| `PATCH /api/sites/:id/:collection/:itemId` | `{revision,item:partial}`; no `id` in patch; returns `Site` |
| `DELETE /api/sites/:id/:collection/:itemId` | JSON body `{revision}`; returns `Site` |
| `POST /api/sites/:id/:collection/reorder` | `{revision,ids:[UUID,...]}`; a full permutation containing every current ID exactly once |

Example complete project; the UUID is illustrative and does not identify a real resource:

```json
{"revision":4,"item":{"id":"f9d09b48-5fb7-4d92-b617-1b9c5f13a1df","title":"Exhibition identity","summary":"Identity and exhibition experience design.","body":"The project story and results.","role":"Design","year":"2026","tools":"Visual design","url":"","slug":"exhibition-identity","featured":true}}
```

| Collection / limit | Core fields and limits |
|---|---|
| Projects /30 | `id,title` nonempty ≤120, `summary` ≤700, `body` ≤12000, `role` ≤140, `year` ≤20, `tools` ≤300, HTTP(S) or empty `url`; optional `slug,featured,coverAssetId,galleryAssetIds` with at most12 distinct UUIDs, `richBody,results` ≤4000 |
| Experience /50 | `id,organization` ≤160, `role` ≤140, `startDate,endDate,current,description` ≤5000; optional `accomplishments` with at most20 nonempty strings ≤700 |
| Education/certificates /50 | `id,organization` ≤160, `qualification` ≤180, `startDate,endDate,description` ≤3000, HTTP(S) or empty `verificationUrl`; optional `type:education|certificate` |
| Skills /30 groups | `id,category` nonempty ≤100; `items` contains1–50 nonempty strings ≤100 |
| Articles /100 | `id,slug,title` nonempty ≤180, `summary` ≤700, `body` ≤50000, `published:boolean`; optional `coverAssetId,richBody` |

Dates use ISO `YYYY-MM-DD`. `endDate` accepts `null` and cannot precede the start; experience `current:true` requires `endDate:null`. IDs are unique within each collection; slugs are unique within projects and within articles. Array order is storage order. `featured` stores emphasis state, not permission to reorder data automatically.

New version1 fields are optional for compatibility with older drafts. A legacy client save retains unknown new site fields and fields on remaining projects; deliberate project deletion removes it from the draft only. Do not insert personal demo data into a user draft.

`richBody` is an array with at most100 blocks and50,000 aggregate characters:

```json
[
 {"type":"heading","level":2,"text":"Results"},
 {"type":"paragraph","text":"Plain text rendered without executing HTML."},
 {"type":"list","ordered":false,"items":["First result","Second result"]}
]
```

Paragraph ≤4000, heading `level:2|3` ≤200, and list1–30 strings ≤1000 each. HTML types/fields and script links are unsupported. Backend article `readTimeMinutes` uses richBody word count when it contains nonempty text, otherwise body, divided by200 and rounded up with a1-minute minimum. Article POST/PATCH reject this field; aggregate saves recalculate it instead of trusting the client.

## Assets and images

| Method and path | Result/request |
|---|---|
| `GET /api/sites/:siteId/assets` | At most100 nondeleted assets; DTO excludes storage keys |
| `POST /api/sites/:siteId/assets/upload-intent` | `{mime:"image/png"|"image/jpeg"|"image/webp",size:bytes}`; DTO plus `uploadUrl,uploadHeaders,uploadExpiresIn:600` |
| `POST /api/sites/:siteId/assets/:assetId/complete` | Verifies the image and returns a `ready` DTO; repeating after readiness returns the existing result |
| `GET /api/sites/:siteId/assets/:assetId/download` | Private; `{url,expiresIn:60}` for an owned ready asset |
| `DELETE /api/sites/:siteId/assets/:assetId` | Cannot delete assets referenced by the draft or any retained release; success `{id,status,retryAfter?}` |
| `POST /api/sites/:siteId/assets/cleanup` | Bounded cleanup of100 expired items; `{results}` |
| `GET /api/public/sites/:slug/assets/:assetId` | `302` to a signed GET URL valid60 seconds, only for a reference in the active public release |

Asset DTO: `id,siteId,mime,size,width,height,status,expiresAt,createdAt`. States: `pending,ready,deleting,deleted`. Uploads are limited to5 MiB and single-page PNG/JPEG/WebP images; each side ≤4096 and pixel count ≤16,777,216. Backend checks size, MIME, and ETag, fetches bounded bytes, decodes the image, and conditionally copies the verified version using ETag to a separate key.

The browser PUTs the file directly to `uploadUrl` using exactly `uploadHeaders`, without the application cookie. After PUT succeeds, it calls `/complete` and attaches the ready UUID to the draft. Client-provided MIME alone does not establish validity. Unready/unowned attachments return `422 ASSET_NOT_READY_OR_OWNED`.

**Signed URL semantics:** possession grants access until the60-second expiry; this is not a session. Unpublishing prevents new public URLs but does not invalidate already-issued URLs before expiry or erase downloaded bytes. Never log signed URLs. Deletion retains `deleting` through the PUT window plus one minute so a still-valid PUT cannot recreate staging after cleanup; retry deletion/cleanup later. `cleanup` currently has no automatic schedule.

## Public reads and inquiries

| Method and path | Shape |
|---|---|
| `GET /api/public/sites/:slug` | `{slug,releaseId,publishedAt,draft}` inside `result`; draft here is the immutable public snapshot, not the editing draft |
| `GET /api/public/sites/:slug/projects/:projectId` | `{releaseId,project}`; UUID or project slug, with ID matching preferred |
| `GET /api/public/sites/:slug/articles/:articleSlug` | `{releaseId,article}`; visible article selected for publication only |
| `POST /api/public/sites/:slug/inquiries` | `{name,email,message,website?:""}`; `201` with `{id,createdAt}` |
| `GET /api/sites/:id/inquiries?limit=20&offset=0&status=new` | Private; `{items,hasMore,limit,offset}`; optional `status:new|read|archived` |
| `PATCH /api/sites/:id/inquiries/:inquiryId` | `{status:"read"|"archived"}`; returns the owned record; independent of draft revision |

The public projection hides disabled sections, excludes `published:false` articles, and removes email, website, and social links when contact is hidden. It returns neither account owner nor sessions. Editing a draft does not change the public snapshot; missing publication returns `404`. Web `/p/:slug/projects/:id` and `/p/:slug/articles/:articleSlug` consume published data and require matching release identity. Browser evidence is recorded in STATUS.md.

Inquiry: name1–100, valid email ≤254, message10–3000 characters, empty honeypot `website` if provided. The site must be published at insertion time. Actual delivery is storage in the site inbox; there is currently no owner email notification. Shared database limits:5 per slug/client address/60 seconds and60 per site/hour. Direct Hono calls without server can use IP `unknown`; Bun server derives the trusted socket/proxy address; the Cloudflare Worker entry derives the trusted edge address and overwrites the application client-address header.

## Common errors

| HTTP | Example codes |
|---|---|
| 400 | `VALIDATION_ERROR, INVALID_JSON, INVALID_REFERENCE, INVALID_ORDER, PROFILE_REQUIRED` |
| 401/403 | `UNAUTHORIZED, EMAIL_NOT_VERIFIED, INVALID_ORIGIN` |
| 404 | `NOT_FOUND`; includes unowned resources |
| 409 | `REVISION_CONFLICT, PUBLICATION_CONFLICT, ITEM_EXISTS, ALREADY_EXISTS, ASSET_REFERENCED, ASSET_STATE_CONFLICT, UPLOAD_EXPIRED, UPLOAD_NOT_FOUND, UPLOAD_CHANGED` |
| 413 | `BODY_TOO_LARGE` |
| 422 | `ASSET_NOT_READY_OR_OWNED, INVALID_IMAGE, UPLOAD_METADATA_MISMATCH, UPLOAD_SIZE_MISMATCH` |
| 429 | `RATE_LIMITED, ASSET_LIMIT_REACHED` |
| 502/503 | `STORAGE_PROVIDER_ERROR, STORAGE_UNAVAILABLE, DATABASE_UNAVAILABLE`; mail retains the native Better Auth contract |
| 500 | `INTERNAL_ERROR`; internal details are not sent to the client |

## Source and evidence limits

Implementation source: `apps/api/src/routes/{sites,content,assets,inquiries}.ts` and associated services, `lib/auth.ts`, `config/env.ts`, and Zod contracts. The authentication protocol is documented in [Better Auth Email & Password](https://better-auth.com/docs/authentication/email-password). Operational details, CORS, and unconfigured integrations are in [OPERATIONS.md](OPERATIONS.md). This file does not claim published OpenAPI documentation, R2/SMTP verification, or production deployment.

## Platform administration

All `/api/admin/*` endpoints require a database-backed Better Auth session with the `admin` role; impersonated sessions are rejected. No account is automatically promoted. Native user/role/ban/password/session operations remain under the official `/api/auth/admin/*` protocol and web `adminClient()`.

- `GET /api/admin/sites`: bounded `limit` (1–100, default 20), `offset` (0–10000), optional `suspended=true|false` and `published=true|false`; returns metadata only, `items/hasMore/limit/offset`.
- `GET /api/admin/sites/:id`: site metadata plus release/asset/inquiry counts; excludes draft, release snapshots, inquiry messages and owner contact data.
- `GET /api/admin/resources`: actual aggregate counts of users, sites, suspended/published pointers, releases, assets and inquiries. Published count describes retained pointers, including inaccessible moderated sites.
- `POST /api/admin/sites/:id/suspend` and `/resume`: strict `{reason}` body, trimmed 3–500 characters. State transition and successful reason/audit commit together. Duplicate state returns `409 MODERATION_CONFLICT`; missing site returns `404 NOT_FOUND`. Resume clears active suspension reason; historical audit reasons remain.
- `GET /api/admin/audit`: bounded pagination plus optional actorId, action, targetType (`site|user|session`), targetId and status (`attempted|succeeded|failed`). Returns sanitized audit data and ISO timestamps; cannot edit/delete audit through this API.

Suspension blocks public portfolio/detail reads, new public signed asset links and inquiry intake, as does an active owner ban. Public denial is `404 NOT_FOUND`. Suspended owner can inspect/edit drafts and unpublish; publish/history activation return `403 SITE_SUSPENDED`. Moderation preserves the published pointer and immutable releases; resuming/unbanning restores access to the retained active release. Already issued signed asset links retain their documented 60-second expiry.

Native auth-admin mutation audits cover set-role, create-user, update-user, ban-user, unban-user, impersonate-user, stop-impersonating, revoke-user-session, revoke-user-sessions, remove-user and set-user-password. Supported before/after hooks persist an attempt then finalize outcome. Native operation and audit finalization are separate transactions; interrupted events stay `attempted`. These audits contain actor/target IDs and action/status, never passwords, cookies, session tokens, email or full native request bodies. Single-session revocation resolves the database session ID privately; mutation request IDs are generated in the native hook independently of Hono IDs. Unauthorized requests denied before an admin mutation are not mutation audit entries.

The public image gateway permits CORP cross-origin only on successful302 redirects to embed assets from the independent web host; private and rejected responses remain same-origin. Active public release checks still apply.

## Published discovery — 2026-10-14
GET /api/public/sitemap exposes only current accessible published slug/publishedAt pairs;100 per page, optional after slug cursor and nextCursor. Strict invalid/unknown queries400. Draft-only sites, suspended sites and active owner bans excluded by the same public predicate. No draft/account/asset key fields. Web /sitemap.xml is an XML index; /p/:slug/sitemap.xml lists visible current portfolio/project/article routes only, no-store; failure503, missing publication404. Safe database network/read deadline failures return503 DATABASE_UNAVAILABLE, including wrapped errors.
