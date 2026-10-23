"""Build the Ichnara v2 brand kit and the app's logo data from the reviewed masters in docs/brand/v2.

Masters come from docs/brand/v2/generate.py (rebuilt folded-band emblem, Readex Pro 600 wordmarks).
This script only composes them: lockups in every colourway, the app icon, the overview board, the
manifest and apps/web/src/components/ui/brand-artwork.ts. No provider or network operations.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/brand/ichnara"
V2 = ROOT / "docs/brand/v2"
NS = "http://www.w3.org/2000/svg"
INK, ACCENT, WHITE, ACCENT_ON_DARK, ICON_SOFT = "#241B38", "#3F46C8", "#FFFFFF", "#A4A9FF", "#C9CCFF"

CAP = 700  # Readex Pro capital height in font units
EMBLEM_H = CAP * 1.10  # the emblem is slightly taller than the capitals and centred on them
GAP = CAP * 0.30
PAD = 30
# Header size: the emblem renders 30px tall in both languages, so the capitals are 27px.
DISPLAY = 30 / EMBLEM_H


def r(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


def master(name):
    text = (V2 / name).read_text()
    box = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).split()]
    paths = re.findall(r'<path(?: data-piece="(\w)")? d="([^"]+)"', text)
    return box, paths


(e_box, e_paths) = master("emblem.svg")
EMBLEM_SCALE = EMBLEM_H / e_box[3]
EMBLEM_W = e_box[2] * EMBLEM_SCALE
EMBLEM_TOP = -CAP / 2 - EMBLEM_H / 2
pieces = {piece: d for piece, d in e_paths}


def lockup(lang):
    """Emblem and word positions in font units (y down, baseline 0) plus the tight viewBox."""
    (wx, wy, ww, wh), [(_, word)] = master(f"wordmark-{lang}.svg")
    if lang == "en":  # reading order: emblem first
        emblem_x, word_x = 0, EMBLEM_W + GAP - wx
    else:
        word_x, emblem_x = -wx, ww + GAP
    top = min(EMBLEM_TOP, wy)
    bottom = max(EMBLEM_TOP + EMBLEM_H, wy + wh)
    box = (-PAD, top - PAD, EMBLEM_W + GAP + ww + 2 * PAD, bottom - top + 2 * PAD)
    emblem_t = f"translate({r(emblem_x)} {r(EMBLEM_TOP)}) scale({r(EMBLEM_SCALE)})"
    return box, emblem_t, f"translate({r(word_x)} 0)", word, bottom


def svg(box, body, label):
    return f'<svg xmlns="{NS}" viewBox="{" ".join(r(v) for v in box)}" role="img" aria-label="{label}">{body}</svg>\n'


def emblem_body(transform, a, b):
    return f'<g transform="{transform}"><path d="{pieces["a"]}" fill="{a}"/><path d="{pieces["b"]}" fill="{b}"/></g>'


COLOURWAYS = {  # name: (emblem piece a, emblem piece b, word)
    "duo": (INK, ACCENT, INK),
    "reverse": (WHITE, ACCENT_ON_DARK, WHITE),
    "ink": (INK, INK, INK),
    "violet": (ACCENT, ACCENT, ACCENT),
    "white": (WHITE, WHITE, WHITE),
}
LABELS = {"en": "Ichnara", "ar": "إيكنارا — Ichnara"}
for stale in [*OUT.glob("ichnara-initial-*"), OUT / "NotoSansArabic-LICENSE.txt"]:
    stale.unlink(missing_ok=True)

layouts = {lang: lockup(lang) for lang in ("en", "ar")}
for lang, (box, emblem_t, word_t, word, _) in layouts.items():
    suffix = "" if lang == "en" else "-ar"
    wbox, _ = master(f"wordmark-{lang}.svg")
    for name, (a, b, ink) in COLOURWAYS.items():
        body = emblem_body(emblem_t, a, b) + f'<path transform="{word_t}" d="{word}" fill="{ink}"/>'
        (OUT / f"ichnara-logo{suffix}-{name}.svg").write_text(svg(box, body, LABELS[lang]))
        if name not in ("duo", "reverse"):
            word_box = (wbox[0] - PAD, wbox[1] - PAD, wbox[2] + 2 * PAD, wbox[3] + 2 * PAD)
            (OUT / f"ichnara-wordmark{suffix}-{name}.svg").write_text(svg(word_box, f'<path d="{word}" fill="{ink}"/>', LABELS[lang]))

emblem_box = (-6, -6, e_box[2] + 12, e_box[3] + 12)
for name, (a, b, _) in COLOURWAYS.items():
    (OUT / f"ichnara-emblem-{name}.svg").write_text(svg(emblem_box, emblem_body("", a, b), "Ichnara emblem"))

# App icon and favicon: white emblem (soft second band) on an indigo tile, from the small-size master.
small_box, small_paths = master("emblem-small.svg")
small = {piece: d for piece, d in small_paths}
icon_scale = 64 * 0.6 / e_box[3]
icon_t = f"translate({r((64 - e_box[2] * icon_scale) / 2)} {r((64 - e_box[3] * icon_scale) / 2)}) scale({r(icon_scale)})"
icon_body = f'<g transform="{icon_t}"><path d="{small["a"]}" fill="{WHITE}"/><path d="{small["b"]}" fill="{ICON_SOFT}"/></g>'
icon = svg((0, 0, 64, 64), f'<rect width="64" height="64" rx="15" fill="{ACCENT}"/>' + icon_body, "Ichnara icon")
(OUT / "favicon.svg").write_text(icon)
(ROOT / "apps/web/src/app/icon.svg").write_text(icon)

# Overview board.
def place(lang, colour, x, y, height):
    box, emblem_t, word_t, word, _ = layouts[lang]
    a, b, ink = COLOURWAYS[colour]
    k = height / box[3]
    inner = emblem_body(emblem_t, a, b) + f'<path transform="{word_t}" d="{word}" fill="{ink}"/>'
    return f'<g transform="translate({r(x)} {r(y)}) scale({r(k)}) translate({r(-box[0])} {r(-box[1])})">{inner}</g>', box[2] * k


en, en_w = place("en", "duo", 120, 150, 150)
ar, ar_w = place("ar", "duo", 0, 400, 150)
ar = ar.replace("translate(0 400)", f"translate({r(1480 - ar_w)} 400)", 1)
dark_en, _ = place("en", "reverse", 120, 690, 90)
dark_ar, dark_ar_w = place("ar", "reverse", 0, 690, 90)
dark_ar = dark_ar.replace("translate(0 690)", f"translate({r(1480 - dark_ar_w)} 690)", 1)
board = (
    f'<rect width="1600" height="900" fill="{WHITE}"/><rect y="620" width="1600" height="280" fill="{INK}"/>'
    f'<text x="120" y="96" fill="#6B6880" font-family="Arial" font-size="20">ICHNARA BRAND V2 · EMBLEM, READEX PRO 600 · {INK} / {ACCENT}</text>'
    + en + ar + dark_en + dark_ar
)
(OUT / "brand-overview.svg").write_text(svg((0, 0, 1600, 900), board, "Ichnara brand overview"))

# Shared app data: per-locale lockup geometry, display size and the emblem's accent piece.
artwork = {}
en_bottom = layouts["en"][4]
for lang, (box, emblem_t, word_t, word, bottom) in layouts.items():
    artwork[lang] = {
        "viewBox": " ".join(r(v) for v in box),
        "width": round(box[2] * DISPLAY, 1),
        "height": round(box[3] * DISPLAY, 1),
        # Arabic descenders hang below the Latin baseline row instead of enlarging the header.
        "trim": round(max(0, bottom - en_bottom) * DISPLAY, 1),
        "groups": [
            {"role": "emblem", "transform": emblem_t, "paths": [{"d": pieces["a"]}, {"d": pieces["b"], "tone": "accent"}]},
            {"role": "word", "transform": word_t, "paths": [{"d": word}]},
        ],
    }
(ROOT / "apps/web/src/components/ui/brand-artwork.ts").write_text(
    "/** Ichnara v2 outlined artwork; generated by scripts/build-brand-kit.py. */\n"
    f"export const brandArtwork = {json.dumps(artwork, ensure_ascii=False, indent=chr(9))} as const;\n"
)

manifest = {
    "brand": "Ichnara",
    "arabicName": "إيكنارا",
    "version": "2.0",
    "primary": "ichnara-logo-duo.svg",
    "arabicPrimary": "ichnara-logo-ar-duo.svg",
    "reverse": "ichnara-logo-reverse.svg",
    "arabicReverse": "ichnara-logo-ar-reverse.svg",
    "emblem": "ichnara-emblem-duo.svg",
    "favicon": "favicon.svg",
    "colors": {"accent": ACCENT, "ink": INK, "accentOnDark": ACCENT_ON_DARK, "white": WHITE},
    "construction": "Folded-band emblem rebuilt on a hexagonal ring (two congruent bands, 180-degree rotation, uniform gap); Readex Pro 600 wordmarks (SIL OFL 1.1), outlined",
    "humanApproved": "2026-10-23: keep the folded-band emblem idea; balanced weight; Readex Pro wordmark",
}
(OUT / "brand.json").write_text(json.dumps(manifest, ensure_ascii=False, indent="\t") + "\n")
(OUT / "ReadexPro-LICENSE.txt").write_bytes((V2 / "ReadexPro-LICENSE.txt").read_bytes())
print("Built v2 lockups, emblem, icon, overview, manifest and shared locale artwork data.")
