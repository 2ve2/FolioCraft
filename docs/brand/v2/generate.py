"""Generate the Ichnara v2 brand masters: the rebuilt folded-band emblem and Readex Pro wordmarks.

The emblem keeps the human-approved folded-band idea, rebuilt geometrically: a pointy-top hexagonal
ring (inner half-width 0.32 of the outer) cut by two vertical channels into two congruent bands
related by a 180-degree rotation, one uniform gap, consistent fillets. Wordmarks are Readex Pro 600
(SIL OFL 1.1) shaped with HarfBuzz and outlined; no font is needed to render the results.

Requires: pip install fonttools brotli uharfbuzz, and the @fontsource/readex-pro 5.3.0 files, e.g.
  mkdir -p work/brand-fonts && cd work/brand-fonts && bun add @fontsource/readex-pro@5.3.0
Usage: python3 docs/brand/v2/generate.py [path/to/@fontsource/readex-pro]
Writes emblem.svg, wordmark-en.svg, wordmark-ar.svg and ReadexPro-LICENSE.txt next to this file.
"""
import io
import math
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CANDIDATES = [ROOT / "work/brand-fonts/node_modules/@fontsource/readex-pro", ROOT / "work/logo/fonts/node_modules/@fontsource/readex-pro"]
FONTS = Path(sys.argv[1]) if len(sys.argv) > 1 else next((p for p in CANDIDATES if p.exists()), CANDIDATES[0])
T30 = math.tan(math.radians(30))


def r(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


def fillet_path(points, radii):
    """Closed polygon with a circular fillet of radii[i] at each vertex (y down)."""
    n = len(points)
    segments = []
    for i in range(n):
        p0, p1, p2 = points[i - 1], points[i], points[(i + 1) % n]
        v1 = (p0[0] - p1[0], p0[1] - p1[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1, u2 = (v1[0] / l1, v1[1] / l1), (v2[0] / l2, v2[1] / l2)
        angle = math.acos(max(-1, min(1, u1[0] * u2[0] + u1[1] * u2[1])))
        d = min(radii[i] / math.tan(angle / 2), l1 * 0.45, l2 * 0.45)
        radius = d * math.tan(angle / 2)
        start = (p1[0] + u1[0] * d, p1[1] + u1[1] * d)
        end = (p1[0] + u2[0] * d, p1[1] + u2[1] * d)
        sweep = 1 if (u1[0] * u2[1] - u1[1] * u2[0]) < 0 else 0
        segments.append((start, radius, sweep, end))
    path = f"M{r(segments[0][0][0])} {r(segments[0][0][1])}"
    for index, (start, radius, sweep, end) in enumerate(segments):
        if index:
            path += f"L{r(start[0])} {r(start[1])}"
        path += f"A{r(radius)} {r(radius)} 0 0 {sweep} {r(end[0])} {r(end[1])}"
    return path + "Z"


def emblem(R=120.0, inner=0.32, gap=0.07, outer_r=0.11, inner_r=0.03, end_r=0.015):
    """Two band paths and the (width, height) box; origin at the top-left of the hexagon's box."""
    W = R * math.cos(math.radians(30))
    a = inner * W
    g = gap * R / 2
    r_in = a / math.cos(math.radians(30))
    band = [
        (-a - g, -(R - (a + g) * T30)),  # top channel, outer edge
        (-W, -R / 2),
        (-W, R / 2),
        (0, R),
        (a - g, R - (a - g) * T30),  # bottom channel, outer edge
        (a - g, r_in / 2 + g * T30),  # bottom channel, inner edge
        (0, r_in),
        (-a - g, r_in / 2 - g * T30),
    ]
    radii = [end_r * R, outer_r * R, outer_r * R, outer_r * R, end_r * R, end_r * R, inner_r * R, inner_r * R]
    other = [(-x, -y) for x, y in band]
    place = lambda pts: [(x + W, y + R) for x, y in pts]
    return fillet_path(place(band), radii), fillet_path(place(other), radii), (2 * W, 2 * R)


def outline(script, text):
    """Readex Pro 600 outlines in font units with y down; returns (path, x0, y0, x1, y1)."""
    source = TTFont(FONTS / f"files/readex-pro-{script}-600-normal.woff2")
    source.flavor = None
    raw = io.BytesIO()
    source.save(raw)
    font = hb.Font(hb.Face(raw.getvalue()))
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(font, buffer)
    glyphs, order = source.getGlyphSet(), source.getGlyphOrder()
    pen, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
    x = 0
    for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions):
        matrix = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)
        glyphs[order[info.codepoint]].draw(TransformPen(pen, matrix))
        glyphs[order[info.codepoint]].draw(TransformPen(bounds, matrix))
        x += pos.x_advance
    return (pen.getCommands(), *bounds.bounds)


NS = "http://www.w3.org/2000/svg"
a_path, b_path, (ew, eh) = emblem()
(HERE / "emblem.svg").write_text(
    f'<svg xmlns="{NS}" viewBox="0 0 {r(ew)} {r(eh)}" role="img" aria-label="Ichnara emblem"><path data-piece="a" d="{a_path}"/><path data-piece="b" d="{b_path}"/></svg>\n'
)
for name, script, text in [("en", "latin", "Ichnara"), ("ar", "arabic", "إيكنارا")]:
    d, x0, y0, x1, y1 = outline(script, text)
    # The viewBox is the ink bounds; baseline is y = 0 and the Latin capital height is 700 units.
    (HERE / f"wordmark-{name}.svg").write_text(
        f'<svg xmlns="{NS}" viewBox="{r(x0)} {r(y0)} {r(x1 - x0)} {r(y1 - y0)}" data-baseline="0" data-cap="700" role="img" aria-label="{text}"><path d="{d}"/></svg>\n'
    )
(HERE / "ReadexPro-LICENSE.txt").write_bytes((FONTS / "LICENSE").read_bytes())
print(f"emblem {r(ew)}x{r(eh)}; wordmarks from {FONTS}")
