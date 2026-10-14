# FolioCraft Web

A Next.js frontend independent of the backend. `src/app` owns routes, layout, and metadata. Application components live in `src/features`, grouped into studio/content/assets/management/portfolio; shared controls live in `src/components/ui`.

Studio composes screens, while `features/studio/use-studio-controller.ts` coordinates draft loading, recovery, saving, publication, and session changes. Each content editor has a dedicated file and uses the shared update function; do not create separate save requests that bypass draft revisions or operation locks.

Public output and preview share `@folio/portfolio`; data contracts use `@folio/contracts`. This application imports neither database source nor API secrets. Better Auth client configuration is in `lib/auth-client.ts`, and domain requests are in `lib/api.ts`.

`src/app/globals.css` is an ordered import entry point. The order of `src/styles` files is part of the cascade, not alphabetical sorting. CSS Modules remain beside their feature. Public portfolio styles live in `packages/portfolio/src/styles.ts`.

Run from the root with `bun run dev:web`. Configure the public API origin in `.env.local` using `.env.example`. See the [source guide](../../docs/SOURCE_STRUCTURE.md) and [design system](../../docs/DESIGN_SYSTEM.md). Verification evidence and its limits are in [STATUS](../../docs/STATUS.md).
