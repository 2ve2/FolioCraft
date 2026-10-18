# Ichnara Web

A Next.js frontend independent of the backend. `src/app` owns routes, layout, and metadata. Application components live in `src/features`, grouped into studio/content/assets/management/portfolio; shared controls live in `src/components/ui`.

Studio composes screens, while `features/studio/use-studio-controller.ts` coordinates draft loading, recovery, saving, publication, and session changes. `sections/content-section.tsx` composes separate profile/projects editors; `draft-errors.ts` owns pure validation-message formatting. Each content editor has a dedicated file and uses the shared update function; do not create separate save requests that bypass draft revisions or operation locks.

Management is grouped into `management/admin`, `management/site` and `management/shared`. The admin view delegates requests, selection and named actions to `use-admin-controller.ts`; shared pagination, errors, dates, copy, types and styles stay together. Asset preview/retry is separate from picker actions.

Public output and preview share `@ichnara/portfolio`; data contracts use `@ichnara/contracts`. This application imports neither database source nor API secrets. Better Auth client configuration is in `lib/auth-client.ts`, and domain requests are in `lib/api.ts`.

`src/app/globals.css` is an ordered import entry point. The order of `src/styles` files is part of the cascade, not alphabetical sorting. CSS Modules remain beside their feature. `landing.css` follows `welcome.css` to preserve rule order. Public portfolio styles live in `packages/portfolio/src/styles.ts`.

Cloudflare builds use `bun run --cwd apps/web build:cloudflare` from the root and the pinned OpenNext adapter. `open-next.config.ts` selects Webpack; the root Bun patch fixes its manifest loader. `wrangler.toml` serves SSR/static assets and enables public Worker-to-Worker fetch routing. Build-time public origins and runtime API origin must match the trial. See [CLOUDFLARE](../../docs/CLOUDFLARE.md) for deployment steps and evidence.

Run from the root with `bun run dev:web`. Configure the public API origin in `.env.local` using `.env.example`. See the [source guide](../../docs/SOURCE_STRUCTURE.md) and [design system](../../docs/DESIGN_SYSTEM.md). Verification evidence and its limits are in [STATUS](../../docs/STATUS.md).

Settings can restore a downloaded draft JSON backup. The bounded local reader validates schema/version before an explicit in-page replacement confirmation; the controller saves through the existing owned revisioned endpoint and changes editor state only on success. Restoring does not publish, rename the site or transfer image files. References to unavailable/foreign images are rejected by the backend. Older omitted optional fields are normalized to clear newer content during restoration. Focused tests: `bun test ./apps/web/tests/draft-import.test.ts` from the root.

/ always remains the product introduction; authenticated entry actions open /studio. /login and /signup are independent pages backed by features/auth, sharing the existing Better Auth client and translated copy. Successful sessions route to /studio for onboarding or editing. The lang query parameter carries interface language across these routes; it does not change portfolio content language. Explore the template opens the existing expanded shared preview instead of scrolling to the inline example.

Platform administration is independent at /admin, /admin/sites, /admin/accounts and /admin/activity, with a shared role-gated shell in features/management/admin. Studio no longer embeds administrative views; its administration navigation saves pending edits before leaving. Account confirmations and moderation reasons remain required, and the backend checks every operation. A fixed from=admin login intent returns to the overview; it does not accept arbitrary redirect destinations or grant privileges.
