# Ichnara — bilingual brand kit v1.3

Approved by the human on2026-10-18 after reviewing round2: I1 capped Latin initial, A1 Arabic spelling/style and C1 indigo #3F46C8. The folded-band emblem is retained. Version 1.3 (2026-10-23, after the human asked for a review of the logo's weight and colour and delegated the decision): the Arabic lettering uses Noto Sans Arabic 600 instead of 700, its tallest letter spans the emblem the way the Latin capital does, and the primary lockup is two-colour (indigo emblem, ink word). Approval is a visual/product choice, not legal clearance or independent-user-study evidence.

## Delivered artwork

- ichnara-logo-duo.svg / ichnara-logo-ar-duo.svg: primary two-colour lockups (indigo emblem, ink word) for light backgrounds; matching 2400px PNGs.
- ichnara-logo-ink/white/violet.svg: Latin composed mark in one colour; matching2400px transparent PNGs.
- ichnara-logo-ar-ink/white/violet.svg: Arabic composed mark; matching2400px transparent PNGs. The Arabic spelling is confirmed in the artwork and brand.json.
- ichnara-wordmark-*.svg/png: standalone Latin lettering; ichnara-wordmark-ar-*.svg/png: standalone Arabic lettering.
- ichnara-emblem-ink/white/violet.svg/png: independent unchanged emblem geometry, with approved color. ichnara-initial-*.svg: capped Latin I.
- favicon.svg/favicon.ico; icon16/32/48/64/180/192/512px PNGs. ICO contains16/32/48px. Apple touch icon uses180px. No PWA support is implied.
- brand-overview.svg/png: Latin/Arabic presentation with a larger explanation-to-wordmark gap. brand.json identifies version/provenance.
- ichnara-brand-kit-v1.3.zip is the sole stored archive. Legacy v1.zip, v1.1.zip and v1.2.zip URLs have direct Next308 redirects to this version. Old versions remain recoverable from Git history, not duplicated public files.

## Colors and use

Accent #3F46C8, ink #241B38, white #FFFFFF. In the product the word takes the surrounding ink (#242137 headers) and the emblem the accent; the footer on dark ink uses the white single-colour lockup. Accent contrast is7.19:1 on white but2.27:1 on brand ink; use white reverse artwork on dark backgrounds. Do not use the accent as ordinary text on dark ink. Round2 contrast data and actual application checks have their documented scope limits.

Scale proportionally, preserve artwork geometry and provide clear space of at least one quarter of the Latin capital height. Product Brand renders the Latin lockup 170px wide; the Arabic lockup is sized so its tallest letter matches the Latin capital (31.5px), with its descender space trimmed from the row. The English wordmark keeps Latin left-to-right geometry; the Arabic master is already shaped and must not be mirrored. Use the emblem at sizes where the complete name becomes unreadable; no independent minimum-size study was completed.

## Provenance and regeneration

Latin lettering is directly drawn outlined geometry; I1 adds clear upper/lower caps to the former vertical stroke. Arabic A1 is derived from Noto Sans Arabic (weight 600 since v1.3; `docs/brand/v1.3/generate.py`) with HarfBuzz shaping, under the included SIL Open Font License. It is not claimed as an exclusive custom Arabic font. The immutable reviewed outlines are the regeneration input; installed fonts are not needed to render the SVGs.

From the repository root, `python3 scripts/build-brand-kit.py` writes SVG/manifest/shared locale data; `bun scripts/render-brand-kit.ts` renders PNGs using the existing Sharp dependency. ICO is generated from the supplied512px PNG using Pillow; `python3 scripts/package-brand-kit.py` builds the final ZIP and copies icons. Run the project formatter after generation and verify the resulting files before committing. No generator connects to a provider/database.

All checks and actual remaining legal/provider/device/user-study unknowns are recorded in docs/STATUS.md and docs/brand/VERIFICATION.md. Neither custom construction, contrast measurements nor human acceptance proves legal availability or worldwide uniqueness.
