# Local browser regression suite

The committed `e2e/` suite uses Playwright 1.64.1, Chromium, the real Bun/Hono API, PostgreSQL and a fresh production Next.js build followed by `next start`. Node 22 and Bun 1.4.2 are used in CI. Install dependencies from the frozen lockfile. No deployment or hosted account is needed.

## Run locally

Provide a disposable PostgreSQL database named exactly `folio_test` on loopback. Do not share it with concurrent integration runs. One optional local Docker setup is:

```sh
docker run --rm --name ichnara-e2e-postgres \
  -e POSTGRES_USER=folio -e POSTGRES_PASSWORD=local-e2e-only -e POSTGRES_DB=folio_test \
  -p 127.0.0.1:55432:5432 -d postgres:18
```

Wait for `docker exec ichnara-e2e-postgres pg_isready -U folio` to succeed, then run from the repository root:

```sh
bun install --frozen-lockfile
bunx --no-install playwright install --with-deps chromium
TEST_DATABASE_URL=postgresql://folio:local-e2e-only@127.0.0.1:55432/folio_test bun run test:e2e
```

A local PostgreSQL installation works equally well. The default is `postgresql://folio@127.0.0.1:55432/folio_test`. The runner rejects non-loopback hosts, any other database name and URL query overrides before applying migrations. Ports 4300 and 4400 must be free; an unrelated server is never reused. Each invocation reapplies the explicit migrations, waits for any existing local native authentication budgets to expire without clearing or disabling them, builds in ignored `work/e2e-runtime/`, starts owned API/web processes and stops them even on failure. It never resets or truncates a database.

The runner constructs a small environment from scratch. Bun children use `--no-env-file`. Next builds a source-only copy without environment files so Next's own environment loader cannot import local provider configuration. Dependencies are linked from this same installed checkout; the staged build is for local Next execution only, never OpenNext packaging or deployment. Original source and production build output are preserved.

Every invocation rebuilds. For a repeatability check, run the same command three times consecutively. Arguments pass through to Playwright, for example `bun run test:e2e --grep "another account"`, `--headed` or `--list`. CI deliberately uses one worker and zero retries so failures remain visible; tests create unique per-test accounts and sites and do not depend on order. The account helper belongs to apps/api/tests/fixtures/e2e-account.ts so it resolves API dependencies in their declaring workspace; e2e/seed.ts only imports that helper. Root E2E typing uses the declared Bun types, which include Node definitions. Fixture teardown deletes only generated fixture accounts, with database cascades removing their site data. An interrupted/killed process can leave disposable records in this local database; no global cleanup or production cleanup command is provided.

## Covered contracts

- Arabic/English browser negotiation, preference-cookie precedence, legacy query preservation, unsupported prefixes and localized real 404 responses.
- Arabic language/direction/heading in initial server HTML.
- Landing, login, signup, privacy, terms and home links preserve the document; a mutation observer catches transient full-screen loading elements.
- Language changes preserve the page, query and hash; browser Back preserves the existing replace-navigation contract.
- Real signup/sign-out/sign-in, onboarding and profile edits; a temporary network barrier holds the real save request to prove language navigation waits for it. No response is mocked or fulfilled with fake success.
- Publication, public SSR language/direction, a later persisted private draft edit remaining absent from both public HTML and the public API, and confirmed unpublication returning 404.
- Cross-account reads, previews, writes, publication and unpublication denied; owner state remains unchanged. Ordinary accounts cannot enter administrative views or fetch administrative APIs.
- Platform landing/auth/recovery/legal/404 pages plus onboarding, all studio sections and ordinary-account administration denial checked in both languages for visible text, placeholders, aria-labels and document titles. `aria-hidden=true` ancestors and non-visible elements are excluded.

Language exceptions are explicitly listed in `e2e/language.ts`: proper names Ichnara/Cloudflare/Neon/Resend, language option names/codes, file formats, IP/URL notation, protocol/address fragments and pixel units. Only a test's known user name, initial, email and generated slug are additionally permitted. These exceptions are product data and notation, not a general exemption for an entire preview or an arbitrary text-containing selector.

## Isolation and limits

The API remains `NODE_ENV=test`, `ADMIN_REQUIRE_MFA=true`, `TRIAL_SKIP_EMAIL_VERIFICATION=false`. Current application semantics require email verification only in production when the trial exception is false; test signup therefore creates a real session without sending mail. This suite does not certify production verification, mail delivery or secure hosted cookies. All provider settings are absent and `/ready` must report mail/storage disabled. Browser requests are restricted to the two exact local origins and unexpected outbound attempts fail the test. Native authentication, ownership, CSP, CORS and request limits are unchanged.

Image upload journeys are excluded because no R2 credentials are used; there is no skipped placeholder upload test. Staff-role/MFA enrollment, real email, Workers runtime, hosted persistence and cross-browser/device coverage are outside this Chromium suite. The existing Worker and guarded integration gates remain required.

## CI evidence

The `e2e` job in `.github/workflows/check.yml` runs on PostgreSQL 18, installs the matching Chromium and has a ten-minute limit. On failure it uploads `work/e2e-report/` and `work/e2e-results/` (HTML, screenshots and retained traces) for seven days. Open the local report with:

```sh
bunx --no-install playwright show-report work/e2e-report
```

Traces include only generated disposable test identities but can contain their session cookies and passwords; do not reuse them or attach unrelated/private browser recordings. There are no real account secrets in the test configuration. Dated actual acceptance results belong in `docs/evidence/2026-10-21-playwright-e2e.md`.
