# Design system

## Current platform system — 2026-10-22

This section is authoritative; the dated sections below are history. Platform screens are landing, authentication, onboarding, studio, administration, legal and 404 pages. Published portfolios and the studio preview use the separate `packages/portfolio` renderer and owner-chosen appearance; none of the rules here apply to them.

- **Fonts.** `--font-ui` Noto Sans Arabic Variable for all interface text (it covers Latin); `--font-mono` IBM Plex Mono for numerals, codes and addresses. No rule may name a system font or a hard-coded family.
- **Type scale** (`apps/web/src/styles/tokens.css`): caption 13px (hints, metadata, footnotes; nothing smaller), label 15px (form labels, buttons, text actions, navigation), body 15px (typed values, paragraphs, the line under a page title), subheading 17px, heading 22px, title 30px (26px on phones). Display sizes are reserved for the landing hero, landing section headlines and the 404 number.
- **Weights.** h1 700, h2 650, h3 600 (`styles/system.css`); buttons 650; labels 600; body 400. The landing hero uses 750.
- **Shape.** `--radius-control` 10px for inputs, selects and buttons; `--radius-card` 12px for editor and list cards; `--radius-panel` 20px for standalone page panels (sign-in, onboarding, legal, admin gate); pills 999px; avatars 50%.
- **Controls.** Interactive targets are at least `--control-min` 44px tall, including text actions. Fields are 48px tall.
- **Color.** One accent family: the approved brand indigo `--color-accent` #3f46c8 with hover #3036a6 for primary actions, and the same hue at lighter or darker steps for focus rings, selected borders, status dots and scrollbars. The brand ink and lavender-tinted neutrals come from the approved brand kit. Owner portfolio accents (including violet) are content, not platform chrome.
- **Layout column.** `--page-gutter` aligns headers, landing sections and the footer to one 1240px column with a 5vw minimum gutter, so the logo sits at the same position in the header and footer of every page.
- **Logo (v2.0, 2026-10-23).** Always the shared `Brand` SVG; never re-typeset the name. The folded-band emblem is rebuilt on exact hexagonal geometry (two congruent bands, one uniform gap) and paired with Readex Pro 600 wordmarks in both languages. On light surfaces the emblem's first band and the word take the surrounding ink and the second band `--color-brand-emblem` (#3f46c8); the dark footer uses `--color-brand-emblem-on-dark` (#a4a9ff). The emblem renders 32px tall in both languages (capitals 27px); Arabic descender space is trimmed from the row so both headers keep the same height. Kit and rules: `apps/web/public/brand/ichnara/README.md`.
- **Phone navigation (2026-10-23).** Below 970px the studio and administration sidebars become a top bar with the logo and a menu button; the button opens the same navigation as a drawer from the reading-start edge (right in Arabic, left in English), with a backdrop, a close button, Escape, focus kept inside while open and returned to the menu button on close. Shared behaviour lives in `components/ui/use-drawer.ts`.

Evidence for the 2026-10-22 audit, including measurements and screenshots, is in [evidence/2026-10-22-full-audit.md](evidence/2026-10-22-full-audit.md).

## History

### Typography and spacing — 2026-10-14 implementation

Updated2026-10-14. These are implementation defaults responding to the human request for measured design; the exact font names were not separately human-selected.

- Self-hosted fonts through exact Fontsource5.3.0 packages: Noto Sans Arabic Variable for UI/simple portfolio; Noto Naskh Arabic Variable for editorial portfolio; IBM Plex Mono for Latin mono with Noto Sans Arabic for Arabic glyphs. Both Noto families include Arabic/Latin subsets. Runtime fonts come from the web host, with system fallbacks during swap. Licenses remain with package distributions.
- UI hierarchy in apps/web/src/styles/tokens.css: captions12px, labels/buttons14px, typed content16px, subheadings18px, section headings24px, page titles32px/phone28px. Body line-height1.7, headings1.35. Essential content should not use decorative branding sizes.
- Portfolio base sizes14/16/18px preserve user choice and layout. Titles scale relative to container width; metadata has12px minimum, typed public fields16px minimum and navigation links44px touch targets.
- Spacing scale4/8/12/16/24/32/48/64px. Cards24px desktop/16px phone; label-to-field8px; fields16px apart; card separation24px; checkboxes18px inside44px label rows with12px text gap.
- Controls44px minimum; control radius8px and card radius12px; two columns of equal navigation cells below430px. Long labels may wrap with cell growth rather than clipping. Editor and preview use separate mobile tabs; preview shares the public renderer.
- Contrast uses readable ink/muted tokens and preset palettes; pale colors are decorative. Browser evidence must recheck dimensions/overflow/font load after changing fonts. Do not claim that all devices or real screen readers were tested from one Chromium session.

Mini-preview scale is an inspection aid, not a change to published font sizes. Use Expand preview for actual-size16px text: desktop1100px with contained scroll if needed; phone adapts to modal content width. Native dialog contains focus, disabled inquiry form prevents accidental preview submission; Escape restores opener focus.

### Final human typography steering — 2026-10-14
Human requested a slight reduction after readability fixes. Current UI caption13,label/body15,subheading17,heading22,title30/phone26; public size keys14/15/17px and metadata minimum13px. Spacing/touch targets retained. Device names are visible; Settings is last; desktop sidebar248px prevents English nav wrapping. Preview parity and skill-group spacing evidence are recorded in STATUS.

### Approved workspace scrolling — 2026-10-14
Desktop>=971px uses independently scrolling editor and preview beneath a fixed action header. Phone retains normal document scrolling and edit/preview tabs. Ichnara chrome uses native violet gradient scroll thumbs/lavender tracks, including editor textareas, with standards and forced-colors fallbacks. Human approved the demonstrated result; no prototype controls remain. Skill headings have16px space before tags and skill groups40px row/32px column separation.

### Local product and action refinements — 2026-10-15
- Product landing preserves the violet identity, uses a real shared-renderer fictional example, responsive benefit/process sections and functional authentication entry. No invented adoption statistics/testimonials.
- Text action arrows share16px SVG dimensions,1.75 stroke,8px text spacing and Arabic mirroring. Project badges/actions wrap with8px row/16px column gaps. Back arrows remain separate directional controls.
- TooltipButton replaces native title popups on existing icon-only logout/remove/accent actions. Violet-black surface, white13px text,9px radius, subtle border/shadow, short fade and reduced-motion/forced-colors fallbacks. Portaled fixed placement has viewport margins and a small pointer; keyboard focus/Escape and aria-describedby are supported. It does not replace accessible button names.
- Mobile logout uses a fixed44px square with explicit flex centering; prior13px horizontal icon drift is corrected. Optional visual appearance controls hide avatar/initials and missing-cover decoration independently; source content stays intact.

### Landing invitation action — 2026-10-16
The bottom signup route link uses a nonshrinking48px minimum height,12px/22px vertical/horizontal padding and a single-line label. Its text sibling flexes with min-width0. Invitation card padding/gap is36px/24px at tablet widths through970px; existing phone rules below721px stack the text and action with28px/24px card padding and16px gap. Target the direct .primary action rather than its HTML element type, since navigation uses a link. Verified in both locales across320–1440px viewport samples.

### Independent administration dashboard — 2026-10-16
Administration uses a white236px navigation rail, a quiet cool background, violet active navigation, an85px desktop topbar and36px content spacing. Overview cards show actual totals with32px-scale numerals; resource/record cards have14px radii and restrained borders. Captions/metadata use13px, with larger section/page titles. Mobile/tablet navigation becomes a top row at970px; record tables become labelled stacked rows at600px. Language, Studio and sign-out remain available on small screens.

Compact refresh uses the existing accessible tooltip, not a large competing primary action. Management uses a native modal, bounded viewport/scroll, matching account ID confirmation, required reasons and distinct destructive/secondary actions. Native dialog Escape/focus rules also apply to role menus through their dialog-local portal. No decorative charts or fabricated metrics. Actual viewport/browser evidence and limits are in STATUS.

### Missing-page recovery and product footer — 2026-10-17
-404 uses a calm lavender radial background, a decorative mono404/orbit/file motif and one localized message. Recovery links target product home and Studio with the selected interface language. Desktop actions sit together; phone actions stack. Scoped header brand sizing below380px prevents language-control overflow.
- ProductFooter is shared by landing, authentication and404. Dark violet surface, white headings, muted lavender body/link text and violet Studio action; three desktop columns become an identity row plus two navigation columns at720px. Footer links have44px minimum height and retain language. Product links use existing home anchors and account/workspace routes. No unimplemented legal or social links.

### Shared loading/error interlude — 2026-10-18
The shared auth/recovery/Studio/admin loading screen uses an abstract portfolio-sheet composition and the approved folded-band/locale wordmark. Existing Noto typography, ink/muted colors and C1 indigo remain. There is no generic spinner, percentage or fabricated stage. Actual status is a polite atomic region; error is an alert with the caller's original actions. Long requests reveal help after10s without declaring failure or retrying automatically. The decorative fold arrival uses transform/opacity for less than5s, stops in error and is disabled for reduced motion. Mobile padding/contained artwork and44px actions are retained. The rejected top-header/single-spinner trial was never accepted or committed as a completed design.

### Published portfolio platform link — 2026-10-18
- Human-confirmed floating attribution:48px circular C1 indigo surface,26px approved white emblem,16px bottom/inline-end safe-area spacing. RTL left/LTR right. Localized visually hidden link name and native keyboard navigation, visible focus ring, print hiding and forced-colors fallback. Footer clearance80px plus bottom safe-area prevents the final content resting behind the badge.
- Public page chrome only: portfolio and project/article detail routes share PublishedShell; portfolio content renderer and private previews remain unchanged. Existing configured webOrigin supplies the platform homepage destination. Local evidence/limits are recorded in STATUS.


### Exact platform color tokens — 2026-10-22

`apps/web/src/styles/tokens.css` owns the platform palette. Use semantic `--color-*` variables for surfaces, text, borders, accents, danger states, focus, shadows and component-specific legacy roles. The existing `--ink`, `--muted`, `--line`, `--paper`, `--purple`, `--soft` and `--focus-ring` names remain compatibility aliases. Administration keeps its scoped aliases for dialogs and shell inheritance.

The extraction deliberately preserves every existing shade and alpha value. Similar values are separate roles, not a new normalized palette. `--color-surface` retains the original `#fff` spelling; `--color-surface-named` retains `white`; the reset retains its distinct transparent-black token. No near-equal values were merged. Component-qualified roles describe existing visual states and allow later deliberate consolidation. No dark mode is enabled.

Keep system `Canvas`, `CanvasText` and `ButtonText` values in forced-colors rules, and literal colors in static feature queries: these describe browser capabilities or the user's system palette. Published portfolio styles and owner appearance data are outside this platform palette; do not replace them with platform tokens. Exact inventory, decoded-pixel comparison and contrast measurements are in [the dated evidence](evidence/2026-10-22-platform-color-tokens.md). Existing low-contrast pairs are reported honestly; this extraction does not redesign them.
