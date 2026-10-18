# Ichnara wordmark — production asset package v1.0

Delivered: 2026-10-18. The primary identity is the name Ichnara itself. There is no added abstract emblem; the browser/touch icon derives from its uppercase I.

## Master artwork

The seven letters are hand-constructed geometric SVG paths with explicit spacing. They do not use an installed font, traced image, image-generator letterform or font-outline extraction. This is custom wordmark artwork for this name, not an installable typeface or a complete alphabet. Preserve the supplied geometry rather than retyping it in a similar font.

- ichnara-wordmark-ink.svg: master for pale backgrounds (#241B38).
- ichnara-wordmark-white.svg: reverse master for violet/dark backgrounds.
- ichnara-wordmark-violet.svg: accent master (#6E46D6) for white/near-white backgrounds.
- Matching2400px transparent PNG files are provided for raster-only workflows.
- ichnara-initial-*.svg: isolated I, matching the wordmark.
- favicon.svg / favicon.ico and icon-16/32/48/64/180/192/512.png: browser/touch applications.180px is the Apple touch icon. ICO includes16/32/48px images. A supplied512px PNG is an asset, not a claim that a PWA manifest/service worker exists.
- brand-overview.svg / brand-overview.png: presentation sheet.

## Color and usage

Brand violet: #6E46D6. Brand ink: #241B38. White: #FFFFFF. Optional pale surface: #F8F6FC. Existing UI fonts/colors outside the brand artwork are retained.

Use proportional scaling. Keep clear space on all sides of at least one quarter of the capital-I height, separate from file padding. Recommended minimum horizontal wordmark width:120px; the installed web component uses150x40px. Use the initial icon below that width. Do not add a dot to I, stretch the letters, change spacing, introduce gradients/shadows or put the ink master on a dark background. Wordmark always reads left-to-right within Arabic/RTL layouts.

## Local application and checks

Brand.tsx contains the same outlined master and inherits its surrounding text color: dark in the header, white in the product footer. Next.js icon.svg/apple-icon.png/favicon.ico use the supplied icon assets. SVG names are accessible. Public portfolio content/rendering is unaffected; the product's own shared identity changes.

Actual checks: web TypeScript; Biome240 files; existing web tests7 pass/85 assertions; final independent-checkout Next production build (15 static outputs including icon routes plus existing dynamic public routes). Browser product-home and404: Arabic/English at320/390/1280px,12 cases, no document overflow and both150x40px wordmarks contained. Header ink/footer white verified; generated icon links observed. Seven production SVGs parse with no text/raster dependency, letter paths fit their viewBox, ten PNG assets have RGBA transparency. These are representative browser checks, not physical-device/accessibility certification.

The custom asset construction does not establish global logo/name uniqueness, font exclusivity or trademark clearance. The earlier generated ribbon/ligature and editorial proposals are superseded for this delivery; they remain historical design evidence. No Cloudflare deployment or GitHub push is included in this step.
