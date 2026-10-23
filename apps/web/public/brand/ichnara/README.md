# Ichnara — bilingual brand kit v2.0

Version 2.0 (2026-10-23). The human asked for the logo to be reworked professionally while keeping the folded-band emblem idea, then chose the balanced emblem weight and the Readex Pro wordmark. Earlier versions (v1.x) are recoverable from Git history; their archive URLs redirect here. Approval is a visual/product choice, not legal clearance or a user-study result.

## Construction

- **Emblem.** The folded-band idea rebuilt on exact geometry: a pointy-top hexagonal ring whose inner hexagon is 0.32 of the outer half-width, cut by two vertical channels into two congruent bands related by a 180-degree rotation. The gap between the bands is one uniform width; outer corners, inner corners and cut ends each use one fillet radius. The first band takes the ink, the second the accent.
- **Wordmarks.** Readex Pro 600 (SIL Open Font License 1.1, see `ReadexPro-LICENSE.txt`), shaped with HarfBuzz and outlined: `Ichnara` and `إيكنارا` come from one bilingual family, so both scripts share stroke weight and proportions. No font is needed to render the files.
- **Lockups.** The emblem is 1.18 times the capital height, centred on the capitals, with a gap of 0.30 capital height. English reads emblem then word; Arabic reads emblem (right) then word.

## Files

- `ichnara-logo-duo.svg` / `ichnara-logo-ar-duo.svg`: primary lockups for light backgrounds.
- `ichnara-logo-reverse.svg` / `ichnara-logo-ar-reverse.svg`: for dark backgrounds (white, light indigo #A4A9FF).
- `ichnara-logo-ink/violet/white.svg` (and `-ar-`): single-colour lockups.
- `ichnara-wordmark-*.svg`: the words alone; `ichnara-emblem-*.svg`: the emblem alone (duo, reverse, ink, violet, white).
- `favicon.svg`, `favicon.ico`, `icon-16…512.png`: white emblem on an indigo tile; the Apple touch icon uses 180 px.
- `brand-overview.svg/png`, `brand.json`; every SVG has a matching PNG (2400 px lockups, 1024 px emblems).
- `ichnara-brand-kit-v2.0.zip` holds all of the above.

## Colours and use

Accent #3F46C8, ink #241B38, accent on dark #A4A9FF, white #FFFFFF. The accent is 7.19:1 on white but 2.27:1 on ink, so dark backgrounds use the reverse lockup. Keep clear space of at least half the emblem's width around the lockup; scale proportionally and never redraw, recolour per piece or re-typeset the name. Use the emblem alone where the full name would be unreadable.

## Regeneration

From the repository root: `python3 docs/brand/v2/generate.py` (needs fonttools, brotli, uharfbuzz and the Readex Pro files, see its header) writes the masters; `python3 scripts/build-brand-kit.py` composes the kit and `apps/web/src/components/ui/brand-artwork.ts`; `bun scripts/render-brand-kit.ts` renders the PNGs; `python3 scripts/package-brand-kit.py` builds the ZIP and copies the icons. Run the formatter afterwards. No step contacts a provider.
