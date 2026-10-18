"""Rebuild review-only vectors, contrast data and overview spacing; never install brand changes."""
from pathlib import Path
import copy,json,math,re,subprocess,colorsys,xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
MASTER=ROOT/'apps/web/public/brand/ichnara'
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)

def svg(label,viewbox,body):
    return f'<svg xmlns="{NS}" role="img" aria-label="{label}" viewBox="{viewbox}">{body}</svg>'

def inner(element):
    return ''.join(ET.tostring(child,encoding='unicode') for child in element)

word=ET.parse(MASTER/'ichnara-wordmark-violet.svg').getroot()
emblem=inner(ET.parse(MASTER/'ichnara-emblem-violet.svg').getroot())
capitals={
 'i-01-capped': 'M-26 0H114V72H80V528H114V600H-26V528H8V72H-26Z',
 'i-02-banner': 'M0 60L60 0H130V76H88V524L122 548V600H-16V548L0 532Z',
 'i-03-soft-caps': 'M-16 0H104Q120 0 120 16V66H88V534H120V584Q120 600 104 600H-16V534H0V66H-16Z',
}
for name,path in capitals.items():
    variant=copy.deepcopy(word);variant[0].set('d',path)
    variant.set('viewBox','-66 -34 2577 681');variant.set('aria-label',f'Ichnara — {name} review only')
    (OUT/f'{name}.svg').write_text(ET.tostring(variant,encoding='unicode'))

# The phonetic spelling is proposed, not human-approved. HarfBuzz performs RTL joining.
arabic='إيكنارا'
font_records=[]
for name,fontname in [('ar-01-sans','NotoSansArabic'),('ar-02-naskh','NotoNaskhArabic')]:
    fontpath=Path('/usr/share/fonts/google-noto-vf')/f'{fontname}[wght].ttf'
    shaped=json.loads(subprocess.check_output(['hb-shape','--no-glyph-names','--output-format=json','--variations=wght=700',str(fontpath),arabic]))
    font=instantiateVariableFont(TTFont(fontpath),{'wght':700},inplace=False)
    glyphs=font.getGlyphSet();order=font.getGlyphOrder();x=y=0;paths=[];bounds=[]
    for item in shaped:
        glyph=glyphs[order[item['g']]];matrix=(1,0,0,1,x+item['dx'],y+item['dy'])
        pathpen=SVGPathPen(glyphs);glyph.draw(TransformPen(pathpen,matrix))
        boundpen=BoundsPen(glyphs);glyph.draw(TransformPen(boundpen,matrix))
        if boundpen.bounds:bounds.append(boundpen.bounds)
        if pathpen.getCommands():paths.append(f'<path d="{pathpen.getCommands()}"/>')
        x+=item['ax'];y+=item['ay']
    left=min(b[0] for b in bounds);bottom=min(b[1] for b in bounds)
    right=max(b[2] for b in bounds);top=max(b[3] for b in bounds)
    scale=min(880/(right-left),250/(top-bottom))
    tx=80+(880-(right-left)*scale)/2-left*scale
    ty=95+top*scale
    body=f'<g fill="#6E46D6" transform="matrix({scale} 0 0 {-scale} {tx} {ty})">'+''.join(paths)+'</g>'
    body+=f'<g fill="#6E46D6" transform="translate(1110 95) scale(1.0)">{emblem}</g>'
    (OUT/f'{name}.svg').write_text(svg(f'{arabic} — {name} review only','0 0 1400 440',body))
    font_records.append({'file':name+'.svg','source':fontname,'weight':700,'shaper':'HarfBuzz','glyphCount':len(shaped),'spellingHumanConfirmed':False})

# WCAG2 relative luminance uses linearized sRGB; no perceptual-uniqueness claim.
def luminance(color):
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return .2126*linear[0]+.7152*linear[1]+.0722*linear[2]
def ratio(a,b):
    values=sorted([luminance(a),luminance(b)])
    return (values[1]+.05)/(values[0]+.05)
backgrounds={'white':'#FFFFFF','brand-ink':'#241B38','UI-ink':'#242137','paper':'#FAF9FC','landing':'#FAF8FC','soft':'#F0EAFB','overview':'#F8F6FC'}
for css in (ROOT/'apps/web/src').rglob('*.css'):
    content=css.read_text()
    for match in re.finditer(r'background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})\b',content):
        color=match.group(1).upper()
        if len(color)==4:color='#'+''.join(c*2 for c in color[1:])
        if len(color)==7 and color not in backgrounds.values():backgrounds['surface-'+color[1:]]=color
colors={'current' :'#6E46D6','reference-user-supplied':'#6747C7','C1-indigo':'#3F46C8','C2-plum':'#853DAD'}
contrast=[]
for name,color in colors.items():
    for surface,bg in backgrounds.items():
        r=ratio(color,bg)
        contrast.append({'color':name,'hex':color,'background':surface,'backgroundHex':bg,'ratio':round(r,4),'AA_normal':r>=4.5,'AA_large_nontext':r>=3,'AAA_normal':r>=7})
(OUT/'contrast.json').write_text(json.dumps({'method':'WCAG2 linear sRGB relative luminance; opaque colors; thresholds use unrounded ratios','referenceStatus':'User-supplied sample, not an independent live Hostinger measurement','pairs':contrast,'arabic':font_records,'backgroundScope':'All literal opaque hex background/background-color values in web CSS, plus named primary surfaces; transparent/gradient compositing and dynamic user portfolio colors excluded'},indent="\t")+'\n')

# Move only the review copy's explanation baseline, leaving the accepted package byte-identical.
overview=(MASTER/'brand-overview.svg').read_text().replace('y="493"','y="514"')
(OUT/'brand-overview-spacing.svg').write_text(overview)

parts=['<rect width="1600" height="2500" fill="#FAF9FC"/>','<text x="70" y="65" font-family="sans-serif" font-size="28" fill="#241B38">ICHNARA / ROUND 2 / REVIEW ONLY</text>']
for index,(name,label) in enumerate(zip(capitals,['I1 — balanced caps (recommended)','I2 — angular banner','I3 — softened caps'])):
    top=100+index*370
    parts.append(f'<text x="70" y="{top+25}" font-family="sans-serif" font-size="22" fill="#241B38">{label}</text>')
    variant=ET.parse(OUT/f'{name}.svg').getroot()
    parts.append(f'<g fill="#6E46D6" transform="translate(90 {top+70}) scale(.45)">{inner(variant)}</g>')
for index,name in enumerate(['ar-01-sans','ar-02-naskh']):
    top=1230+index*430
    label='A1 — Sans / phonetic spelling proposed' if index==0 else 'A2 — Naskh / phonetic spelling proposed'
    parts.append(f'<text x="70" y="{top}" font-family="sans-serif" font-size="22" fill="#241B38">{label}</text>')
    parts.append(f'<g transform="translate(70 {top+10}) scale(.82)">{inner(ET.parse(OUT/f"{name}.svg").getroot())}</g>')
for i,(name,color) in enumerate(list(colors.items())[2:]):
    x=70+i*760
    parts.append(f'<rect x="{x}" y="2110" width="700" height="190" rx="12" fill="{color}"/>')
    parts.append(f'<text x="{x+28}" y="2190" font-family="sans-serif" font-size="30" fill="white">{name} / {color}</text>')
    parts.append(f'<text x="{x+28}" y="2250" font-family="sans-serif" font-size="22" fill="white">White contrast {ratio(color,"#FFFFFF"):.2f}:1</text>')
parts.append('<text x="70" y="2420" font-family="sans-serif" font-size="22" fill="#241B38">No installed changes. No trademark clearance or user-study approval.</text>')
(OUT/'review-sheet.svg').write_text(svg('Ichnara round2 review-only variants','0 0 1600 2500',''.join(parts)))
print(f'Generated {len(capitals)} Latin options,2 Arabic options and {len(contrast)} measured contrast pairs.')
