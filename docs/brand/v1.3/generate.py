"""Generate the v1.3 Arabic lockup master: Noto Sans Arabic 600 outlines sized to the emblem.

Requires: pip install fonttools brotli uharfbuzz. Reads the variable font installed by
@fontsource-variable/noto-sans-arabic. Writes ar-sans-600.svg next to this file.
"""
import glob, io, xml.sax.saxutils as sax
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[3]
FONT = glob.glob(str(ROOT / "node_modules/.bun/@fontsource-variable+noto-sans-arabic@*/node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2"))[0]
TEXT, WEIGHT = "إيكنارا", 600
EMBLEM_X, EMBLEM_Y, EMBLEM_HEIGHT = 852.75, 95, 238

source = TTFont(FONT); source.flavor = None
data = io.BytesIO(); source.save(data)
font = hb.Font(hb.Face(data.getvalue())); font.set_variations({"wght": WEIGHT})
buffer = hb.Buffer(); buffer.add_str(TEXT); buffer.guess_segment_properties(); hb.shape(font, buffer)
instance = instantiateVariableFont(TTFont(FONT), {"wght": WEIGHT}, inplace=False)
glyphs, order = instance.getGlyphSet(), instance.getGlyphOrder()
x = y = 0; paths = []; bounds = []
for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
    glyph = glyphs[order[info.codepoint]]
    matrix = (1, 0, 0, 1, x + position.x_offset, y + position.y_offset)
    pen = SVGPathPen(glyphs); glyph.draw(TransformPen(pen, matrix))
    box = BoundsPen(glyphs); glyph.draw(TransformPen(box, matrix))
    if box.bounds: bounds.append(box.bounds)
    if pen.getCommands(): paths.append(pen.getCommands())
    x += position.x_advance; y += position.y_advance
left, bottom = min(b[0] for b in bounds), min(b[1] for b in bounds)
right, top = max(b[2] for b in bounds), max(b[3] for b in bounds)

# Like the Latin capital, the tallest letter spans the emblem; the baseline sits on the emblem foot,
# and the optical gap keeps the Latin lockup's gap-to-emblem ratio (0.26).
scale = EMBLEM_HEIGHT * 0.98 / top
baseline = EMBLEM_Y + EMBLEM_HEIGHT
word_right = EMBLEM_X + 20 - 0.26 * EMBLEM_HEIGHT
tx = word_right - right * scale
box_left = tx + left * scale - 8
box_top = min(EMBLEM_Y, baseline - top * scale) - 8
box_bottom = baseline - bottom * scale + 8
box_right = EMBLEM_X + 215 + 8
r = lambda n: f"{n:.4f}".rstrip("0").rstrip(".")
view_box = f"{r(box_left)} {r(box_top)} {r(box_right - box_left)} {r(box_bottom - box_top)}"
word_box = f"{r(box_left)} {r(box_top)} {r(word_right - box_left + 8)} {r(box_bottom - box_top)}"
word = "".join(f'<path d="{d}"/>' for d in paths)
emblem = ('<path d="M20 55Q20 41 32 34L88 2V137Q88 146 96 151L155 185L112 210Q105 214 98 210L32 172Q20 165 20 151Z"/>'
          '<path d="M114 43Q121 39 128 43L203 86Q215 93 215 107V185Q215 199 203 206L147 238V127Q147 118 139 113L93 87L93 72Z"/>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" data-word-box="{word_box}" role="img" aria-label="{sax.escape(TEXT)}">'
       f'<g transform="matrix({r(scale)} 0 0 {r(-scale)} {r(tx)} {r(baseline)})">{word}</g>'
       f'<g transform="translate({EMBLEM_X} {EMBLEM_Y}) scale(1.0)">{emblem}</g></svg>')
(Path(__file__).parent / "ar-sans-600.svg").write_text(svg)
print("viewBox", view_box, "word box", word_box, "glyphs", len(paths))
