# Typography and spacing — current implementation

Updated2026-10-14. These are implementation defaults responding to the human request for measured design; the exact font names were not separately human-selected.

- Self-hosted fonts through exact Fontsource5.3.0 packages: Noto Sans Arabic Variable for UI/simple portfolio; Noto Naskh Arabic Variable for editorial portfolio; IBM Plex Mono for Latin mono with Noto Sans Arabic for Arabic glyphs. Both Noto families include Arabic/Latin subsets. Runtime fonts come from the web host, with system fallbacks during swap. Licenses remain with package distributions.
- UI hierarchy in apps/web/src/styles/tokens.css: captions12px, labels/buttons14px, typed content16px, subheadings18px, section headings24px, page titles32px/phone28px. Body line-height1.7, headings1.35. Essential content should not use decorative branding sizes.
- Portfolio base sizes14/16/18px preserve user choice and layout. Titles scale relative to container width; metadata has12px minimum, typed public fields16px minimum and navigation links44px touch targets.
- Spacing scale4/8/12/16/24/32/48/64px. Cards24px desktop/16px phone; label-to-field8px; fields16px apart; card separation24px; checkboxes18px inside44px label rows with12px text gap.
- Controls44px minimum; control radius8px and card radius12px; two columns of equal navigation cells below430px. Long labels may wrap with cell growth rather than clipping. Editor and preview use separate mobile tabs; preview shares the public renderer.
- Contrast uses readable ink/muted tokens and preset palettes; pale colors are decorative. Browser evidence must recheck dimensions/overflow/font load after changing fonts. Do not claim that all devices or real screen readers were tested from one Chromium session.

Mini-preview scale is an inspection aid, not a change to published font sizes. Use Expand preview for actual-size16px text: desktop1100px with contained scroll if needed; phone adapts to modal content width. Native dialog contains focus, disabled inquiry form prevents accidental preview submission; Escape restores opener focus.

## Final human typography steering — 2026-10-14
Human requested a slight reduction after readability fixes. Current UI caption13,label/body15,subheading17,heading22,title30/phone26; public size keys14/15/17px and metadata minimum13px. Spacing/touch targets retained. Device names are visible; Settings is last; desktop sidebar248px prevents English nav wrapping. Preview parity and skill-group spacing evidence are recorded in STATUS.

## Approved workspace scrolling — 2026-10-14
Desktop>=971px uses independently scrolling editor and preview beneath a fixed action header. Phone retains normal document scrolling and edit/preview tabs. Ichnara chrome uses native violet gradient scroll thumbs/lavender tracks, including editor textareas, with standards and forced-colors fallbacks. Human approved the demonstrated result; no prototype controls remain. Skill headings have16px space before tags and skill groups40px row/32px column separation.

## Local product and action refinements — 2026-10-15
- Product landing preserves the violet identity, uses a real shared-renderer fictional example, responsive benefit/process sections and functional authentication entry. No invented adoption statistics/testimonials.
- Text action arrows share16px SVG dimensions,1.75 stroke,8px text spacing and Arabic mirroring. Project badges/actions wrap with8px row/16px column gaps. Back arrows remain separate directional controls.
- TooltipButton replaces native title popups on existing icon-only logout/remove/accent actions. Violet-black surface, white13px text,9px radius, subtle border/shadow, short fade and reduced-motion/forced-colors fallbacks. Portaled fixed placement has viewport margins and a small pointer; keyboard focus/Escape and aria-describedby are supported. It does not replace accessible button names.
- Mobile logout uses a fixed44px square with explicit flex centering; prior13px horizontal icon drift is corrected. Optional visual appearance controls hide avatar/initials and missing-cover decoration independently; source content stays intact.

## Landing invitation action — 2026-10-16
The bottom signup route link uses a nonshrinking48px minimum height,12px/22px vertical/horizontal padding and a single-line label. Its text sibling flexes with min-width0. Invitation card padding/gap is36px/24px at tablet widths through970px; existing phone rules below721px stack the text and action with28px/24px card padding and16px gap. Target the direct .primary action rather than its HTML element type, since navigation uses a link. Verified in both locales across320–1440px viewport samples.

## Independent administration dashboard — 2026-10-16
Administration uses a white236px navigation rail, a quiet cool background, violet active navigation, an85px desktop topbar and36px content spacing. Overview cards show actual totals with32px-scale numerals; resource/record cards have14px radii and restrained borders. Captions/metadata use13px, with larger section/page titles. Mobile/tablet navigation becomes a top row at970px; record tables become labelled stacked rows at600px. Language, Studio and sign-out remain available on small screens.

Compact refresh uses the existing accessible tooltip, not a large competing primary action. Management uses a native modal, bounded viewport/scroll, matching account ID confirmation, required reasons and distinct destructive/secondary actions. Native dialog Escape/focus rules also apply to role menus through their dialog-local portal. No decorative charts or fabricated metrics. Actual viewport/browser evidence and limits are in STATUS.

## Missing-page recovery and product footer — 2026-10-17
-404 uses a calm lavender radial background, a decorative mono404/orbit/file motif and one localized message. Recovery links target product home and Studio with the selected interface language. Desktop actions sit together; phone actions stack. Scoped header brand sizing below380px prevents language-control overflow.
- ProductFooter is shared by landing, authentication and404. Dark violet surface, white headings, muted lavender body/link text and violet Studio action; three desktop columns become an identity row plus two navigation columns at720px. Footer links have44px minimum height and retain language. Product links use existing home anchors and account/workspace routes. No unimplemented legal or social links.
