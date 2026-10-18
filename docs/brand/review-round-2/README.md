# Ichnara — round2 identity review

Date: 2026-10-18. **Historical review submission.** The human subsequently selected I1/A1/C1 and confirmed the Arabic spelling. Current installed artwork and later spacing correction are recorded in STATUS and the v1.2 public kit; the original studies below remain unchanged as evidence. Open index.html for the Arabic review, review-sheet.png for a combined comparison, or individual SVG files for editable outlines.

## Capital-I studies

- I1, i-01-capped.svg: balanced upper/lower caps, recommended for the clearest conventional capital-I cue.
- I2, i-02-banner.svg: angular banner with a short base; preserves a sharper geometric personality.
- I3, i-03-soft-caps.svg: softer cap corners and an asymmetric stem position; a quieter alternative.

All retain the existing other six letter paths. These are drawn vector changes, not a new full font or proof of measured readability. Human selection and actual small-size/readability acceptance remain pending.

## Arabic studies and provenance

Both studies use the same **proposed phonetic spelling**, encoded in the artwork. The human has not confirmed pronunciation or Arabic spelling. A1 uses Noto Sans Arabic700, recommended for closer structural fit; A2 uses Noto Naskh Arabic700, with a more calligraphic contrast. Both pair with the unchanged accepted folded-band emblem. Do not claim exclusive custom lettering: these are font-derived outlines with HarfBuzz RTL shaping, not an invented Arabic typeface. Copies of the Noto SIL OFL licenses are included.

The generator reads locally installed Noto variable font sources and outlines the weight700 glyphs through fontTools; text glyphs are paths in the delivered Arabic SVGs, without runtime font dependencies. Regeneration needs Python/fontTools, HarfBuzz's hb-shape and those fonts. PNGs were rendered using the existing API Sharp dependency. Font/tool availability on another workstation must be checked rather than assumed.

## Candidate colors and contrast

C1 indigo #3F46C8:7.19:1 on white,2.27:1 on brand ink #241B38. C2 plum #853DAD:6.43:1 on white,2.54:1 on brand ink. Both support ordinary AA text on white; neither reaches3:1 on ink. Use the white reverse mark/text on dark ink instead. These are proposals to shift hue toward blue or red; they do not prove perceived differentiation from another brand.

contrast.json contains300 pairs: the current violet, the user-supplied reference sample #6747C7 and two candidates across75 named/literal opaque backgrounds. Sources include web CSS background/background-color declarations plus white/brand ink/UI ink/paper/landing/soft/overview. Transparent/gradient compositing, dynamic user-selected portfolio palettes, typography size/weight and all component states are not a comprehensive accessibility audit. Pass/fail uses unrounded ratios, with linearized sRGB luminance and WCAG2 thresholds4.5 normal text/3 large text or relevant non-text components. Logo text itself is exempt; the measurements inform broader UI usage: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html . Reference sample is human-supplied, not newly measured from Hostinger.

## Explanation spacing

brand-overview-spacing.svg/png is a review copy of the accepted overview with only the explanation baseline moved493→514. Existing main-wordmark bottom is approximately462; the new baseline gives52px separation before font ascent. This fixes the cramped review layout without altering the approved public overview or ZIPs. Package regeneration/application awaits acceptance.

## Actual proof and open decisions

Seven SVGs XML-parse; review-sheet/spacing PNGs were rendered and visually inspected. Initial combined-sheet row overlap was corrected before delivery. All40 accepted brand/icon/component files compared byte-for-byte with the preceding independent checkout remain identical. Full application gates and browser review evidence are recorded in STATUS; these do not establish aesthetic approval.

Human selection is required for capital-I option, Arabic spelling/style and accent. No registry clearance, exclusivity, worldwide uniqueness, designer endorsement or independent user-study result is claimed. Existing commercial unknowns remain in ../VERIFICATION.md.
