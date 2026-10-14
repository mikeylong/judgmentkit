#!/usr/bin/env python3
"""Build the selected Slab J assets. Requires Pillow and ImageMagick."""
from pathlib import Path
import hashlib, html, json, math, shutil, subprocess, xml.etree.ElementTree as ET
from copy import deepcopy
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
INK,IVORY,NICKEL,RULE='#0B0D0E','#F7F6F2','#8B9096','#DAD7CF'
NS={'s':'http://www.w3.org/2000/svg'}
G=json.loads((ROOT/'geometry.json').read_text())
PARTS=G['canonical']; OPTICAL=G['optical_16']
assert [p.attrib['points'] for p in ET.parse(ROOT/'judgmentkit.svg').findall('.//s:polygon',NS)]==PARTS
SIZES=[16,24,32,48,96,512]
APP_SIZES=[16,24,32,48,64,96,128,180,192,256,512,1024]
GENERATED=[]

def write(name,body):
    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(body);GENERATED.append(name);return p

def doc(body,w=64,h=64,title='JudgmentKit Slab J'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:g}" height="{h:g}" viewBox="0 0 {w:g} {h:g}" role="img"><title>{html.escape(title)}</title>{body}</svg>\n'

def mark(color=INK,nickel=True,x=0,y=0,size=64,parts=None,extra=''):
    parts=PARTS if parts is None else parts
    body=''.join(f'<polygon points="{p}" fill="{NICKEL if nickel and i==2 else color}"/>' for i,p in enumerate(parts))
    return f'<g transform="translate({x:g} {y:g}) scale({size/64:g})" {extra}>{body}</g>'

def rect(x,y,w,h,fill,rx=0,stroke=None):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'

def label(x,y,s,size=16,weight=400,color=INK,anchor=None):
    return f'<text x="{x:g}" y="{y:g}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}"'+(f' text-anchor="{anchor}"' if anchor else '')+'>'+html.escape(s)+'</text>'

def render(src,dest,size=None,opaque=False):
    dest=ROOT/dest;dest.parent.mkdir(parents=True,exist_ok=True)
    cmd=['magick','-font','/System/Library/Fonts/Supplemental/Arial.ttf','-background','none','-density','384' if not size or size<=256 else '192',str(src)]
    cmd+=['-resize',f'{size}x{size}!'] if size else ['-resize','25%']
    cmd+=['-strip','-colorspace','sRGB']
    cmd+=['-alpha','off',f'PNG24:{dest}'] if opaque else [f'PNG32:{dest}']
    subprocess.run(cmd,check=True,capture_output=True);GENERATED.append(str(dest.relative_to(ROOT)))

# The canonical master is never rewritten by this script.
variants=[('reversed',IVORY,True),('monochrome',INK,False),('monochrome-reversed',IVORY,False),('currentcolor','currentColor',False)]
for name,color,nickel in variants: write(f'svg/mark-{name}.svg',doc(mark(color,nickel)))
for name,color,nickel in [('optical-16',INK,True),('optical-16-reversed',IVORY,True),('optical-16-monochrome',INK,False),('optical-16-monochrome-reversed',IVORY,False)]:
    write(f'svg/{name}.svg',doc(mark(color,nickel,parts=OPTICAL),title='JudgmentKit optical 16px derivative'))
for scheme,src in [('primary',ROOT/'judgmentkit.svg')]+[(name,ROOT/f'svg/mark-{name}.svg') for name,_,_ in variants[:3]]:
    for s in SIZES: render(src,f'png/mark-{scheme}-{s}.png',s)
for name in ['optical-16','optical-16-reversed','optical-16-monochrome','optical-16-monochrome-reversed']:
    render(ROOT/f'svg/{name}.svg',f'png/{name}.png',16)

# An explicit optical group is used only at the minimum favicon viewport.
style=f'<style>.foreground{{fill:{INK}}}.nickel{{fill:{NICKEL}}}#optical{{display:none}}@media(max-width:20px){{#canonical{{display:none}}#optical{{display:inline}}}}@media(prefers-color-scheme:dark){{.foreground{{fill:{IVORY}}}}}</style>'
def adaptive_group(name,parts):
    return f'<g id="{name}">'+''.join(f'<polygon class="{ "nickel" if i==2 else "foreground" }" points="{p}"/>' for i,p in enumerate(parts))+'</g>'
write('favicon/favicon.svg',doc(style+adaptive_group('canonical',PARTS)+adaptive_group('optical',OPTICAL)).replace('width="64" height="64"','width="100%" height="100%"'))
write('favicon/favicon-light.svg',doc(mark()))
write('favicon/favicon-dark.svg',doc(mark(IVORY)))
write('favicon/favicon-16-light.svg',doc(mark(parts=OPTICAL)))
write('favicon/favicon-16-dark.svg',doc(mark(IVORY,parts=OPTICAL)))
write('favicon/safari-pinned-tab.svg',doc(mark('#000000',False)))
for s in [16,32,48,64]:
    src=write(f'favicon/source-{s}.svg',doc(rect(0,0,64,64,INK)+mark(IVORY,parts=OPTICAL if s==16 else PARTS)))
    render(src,f'favicon/favicon-{s}.png',s,True)
frames=[Image.open(ROOT/f'favicon/favicon-{s}.png').convert('RGBA') for s in [16,32,48]]
frames[-1].save(ROOT/'favicon/favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48)],append_images=frames[:-1]);GENERATED.append('favicon/favicon.ico')

# Canonical app placement: 640px viewport centered on a square 1024px canvas.
for name,bg,fg in [('app-icon',INK,IVORY),('app-icon-light',IVORY,INK)]:
    src=write(f'app-icons/{name}.svg',doc(rect(0,0,1024,1024,bg)+mark(fg,x=192,y=192,size=640),1024,1024))
    for s in APP_SIZES if name=='app-icon' else [512,1024]: render(src,f'app-icons/{name}-{s}.png',s,True)
for name,s in [('apple-touch-icon',180),('maskable-192',192),('maskable-512',512)]:
    shutil.copyfile(ROOT/f'app-icons/app-icon-{s}.png',ROOT/f'app-icons/{name}.png');GENERATED.append(f'app-icons/{name}.png')
write('app-icons/composer/foreground.svg',doc(mark(IVORY,x=192,y=192,size=640),1024,1024))
write('app-icons/composer/background.svg',doc(rect(0,0,1024,1024,INK),1024,1024))
ios=ROOT/'app-icons/apple/AppIcon.appiconset';ios.mkdir(parents=True,exist_ok=True)
shutil.copyfile(ROOT/'app-icons/app-icon-1024.png',ios/'AppIcon-1024.png');GENERATED.append('app-icons/apple/AppIcon.appiconset/AppIcon-1024.png')
write('app-icons/apple/AppIcon.appiconset/Contents.json',json.dumps({'images':[{'filename':'AppIcon-1024.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}},indent=2)+'\n')
iconset=ROOT/'app-icons/macos/judgmentkit.iconset';iconset.mkdir(parents=True,exist_ok=True)
for s in [16,32,128,256,512]:
    for mult,suffix in [(1,''),(2,'@2x')]:
        target=iconset/f'icon_{s}x{s}{suffix}.png';shutil.copyfile(ROOT/f'app-icons/app-icon-{s*mult}.png',target);GENERATED.append(str(target.relative_to(ROOT)))
mac_frames=[Image.open(ROOT/f'app-icons/app-icon-{n}.png').convert('RGBA') for n in [32,64,128,256,512,1024]]
mac_frames[-1].save(ROOT/'app-icons/macos/judgmentkit.icns',format='ICNS',append_images=mac_frames);GENERATED.append('app-icons/macos/judgmentkit.icns')
write('web-manifest-icons.json',json.dumps({'icons':[
 {'src':f'/brand/slab-j/app-icons/{name}.png','sizes':f'{s}x{s}','type':'image/png','purpose':purpose}
 for name,s,purpose in [('app-icon-192',192,'any'),('app-icon-512',512,'any'),('maskable-192',192,'maskable'),('maskable-512',512,'maskable')]]},indent=2)+'\n')
write('web-head.html','''<!-- Adjust /brand/slab-j to the chosen static asset mount. -->
<link rel="icon" href="/brand/slab-j/favicon/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/brand/slab-j/favicon/favicon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="/brand/slab-j/app-icons/apple-touch-icon.png" sizes="180x180">
<link rel="mask-icon" href="/brand/slab-j/favicon/safari-pinned-tab.svg" color="#0B0D0E">
''')

# Portable Inter 780 outlines are the rebuild source. Canonical horizontal exports
# must remain byte-identical to the approved light/dark proofs.
ET.register_namespace('',NS['s'])
contract=json.loads((ROOT/'lockup-contract.json').read_text())
metrics=json.loads((ROOT/'wordmark-source/metrics.json').read_text())
word_source=ET.parse(ROOT/'wordmark-source/judgmentkit-wordmark.svg').getroot()
word_paths=word_source.findall('s:path',NS)
assert metrics['fontFamily']=='Inter' and metrics['weightAxis']==780 and metrics['opticalSizeAxis']==32 and metrics['fallbackRuns']==0
assert hashlib.sha256('\n'.join(p.attrib['d'] for p in word_paths).encode()).hexdigest()==contract['font']['glyph_path_digest']
ib=metrics['inkBounds'];word_scale=38/metrics['capHeight']
mark_source=ET.parse(ROOT/'judgmentkit.svg').getroot().findall('.//s:polygon',NS)

def lockup_root(width,height,title):
    tree=ET.Element('{'+NS['s']+'}svg',{'width':f'{width:.9f}','height':str(height),'viewBox':f'0 0 {width:.9f} {height}','role':'img','aria-labelledby':'title','data-font-family':'Inter','data-font-weight':'780','data-font-optical-size':'32','data-mark-height':'60','data-cap-height':'38','data-ink-gap':'20'})
    ET.SubElement(tree,'{'+NS['s']+'}title',{'id':'title'}).text=title
    return tree

def lockup_groups(tree,color,mark_x,mark_y,word_x,baseline,nickel=True):
    mg=ET.SubElement(tree,'{'+NS['s']+'}g',{'data-role':'mark','transform':f'translate({mark_x:.12f} {mark_y:.12f}) scale({1.0:.12f})'})
    for i,p in enumerate(mark_source):
        polygon=deepcopy(p);polygon.attrib.pop('class',None);polygon.attrib['fill']=NICKEL if i==2 and nickel else color;mg.append(polygon)
    wg=ET.SubElement(tree,'{'+NS['s']+'}g',{'data-role':'wordmark','fill':color,'transform':f'translate({word_x:.12f} {baseline:.12f}) scale({word_scale:.12f})'})
    for p in word_paths:wg.append(deepcopy(p))

def render_lockup(src,name):
    dest=ROOT/f'lockups/{name}.png'
    subprocess.run(['magick','-background','none','-density','384',str(src),'-strip',str(dest)],check=True,capture_output=True)
    GENERATED.append(str(dest.relative_to(ROOT)))
    return dest

word_width=ib['width']*word_scale
horizontal_width=24+36+20+word_width+24
for name,theme,color,nickel in [('horizontal','light',INK,True),('horizontal-reversed','dark',IVORY,True),('horizontal-monochrome','monochrome',INK,False)]:
    title=f'JudgmentKit consistent horizontal lockup, Inter 780, {theme}'
    tree=lockup_root(horizontal_width,109,title)
    lockup_groups(tree,color,10,22,80-ib['x']*word_scale,73,nickel)
    body=ET.tostring(tree,encoding='unicode')
    if nickel:
        reference=ROOT/f'source/approved-horizontal-{theme}.svg'
        assert body.encode()==reference.read_bytes(),f'Approved {theme} SVG drift'
    src=write(f'lockups/{name}.svg',body)
    png=render_lockup(src,name)
    if nickel:
        reference=ROOT/f'source/approved-horizontal-{theme}.png'
        assert Image.open(png).convert('RGBA').tobytes()==Image.open(reference).convert('RGBA').tobytes(),f'Approved {theme} raster drift'
        shutil.copyfile(reference,png)

# Stacked is a documented derivative: identical mark height and cap height,
# centered ink bounds, 20px vertical ink gap, minimum 24px outer padding.
stacked_width=word_width+48
stacked_baseline=104-ib['y']*word_scale
stacked_height=math.ceil(stacked_baseline+(ib['y']+ib['height'])*word_scale+24)
for name,color in [('stacked',INK),('stacked-reversed',IVORY)]:
    tree=lockup_root(stacked_width,stacked_height,f'JudgmentKit stacked derivative, Inter 780, {name}')
    tree.attrib['data-gap-direction']='vertical'
    lockup_groups(tree,color,stacked_width/2-32,22,24-ib['x']*word_scale,stacked_baseline)
    src=write(f'lockups/{name}.svg',ET.tostring(tree,encoding='unicode'))
    render_lockup(src,name)

def embed_lockup(name,x,y,scale=1):
    groups=ET.parse(ROOT/f'lockups/{name}.svg').getroot().findall('s:g',NS)
    body=''.join(ET.tostring(g,encoding='unicode') for g in groups)
    return f'<g transform="translate({x:g} {y:g}) scale({scale:g})">{body}</g>'

b=rect(0,0,1000,440,IVORY)+rect(500,0,500,440,INK)
b+=label(28,30,'Approved horizontal / Inter 780',16,700)+label(528,30,'Reversed + nickel',16,700,IVORY)
b+=embed_lockup('horizontal',38,52)+embed_lockup('horizontal-reversed',538,52)
b+=label(28,180,'Stacked derivative / same mark and cap heights',13)+label(528,180,'20px vertical ink gap / centered ink bounds',13,400,IVORY)
b+=embed_lockup('stacked',65,188)+embed_lockup('stacked-reversed',565,188)
b+=label(28,412,'Outlined type. Optical size 32. At least 24px outer padding.',13)+label(528,412,'The three canonical Slab J planes remain unchanged.',13,400,IVORY)
src=write('proofs/lockups.svg',doc(b,1000,440));render(src,'proofs/lockups.png')

motion='<style>.cap{animation:reveal .4s ease-out both}.upright{animation:reveal .4s .1s ease-out both}.return{animation:reveal .4s .2s ease-out both}@keyframes reveal{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.cap,.upright,.return{animation:none}}</style>'
body=''.join(f'<polygon class="{cl}" fill="{NICKEL if i==2 else INK}" points="{p}"/>' for i,(cl,p) in enumerate(zip(['cap','upright','return'],PARTS)))
write('svg/mark-motion.svg',doc(motion+body))

# Overview: selected form, family colors, actual app masks, and outlined lockup.
W,H=1280,930
b=rect(0,0,W,H,IVORY)+label(48,64,'JudgmentKit',36,700)+label(48,94,'A / Slab J / refined asset system',16)
b+=label(1232,63,'SELECTED',12,700,anchor='end')+f'<path d="M48 118H1232" stroke="{RULE}"/>'
b+=mark(x=110,y=147,size=224)+label(48,402,'Canonical A',18,700)+label(48,430,'Selected geometry preserved.',13)
b+=rect(452,146,352,224,INK,8)+mark(IVORY,x=540,y=170,size=176)+label(452,402,'Reversed + nickel',18,700)+label(452,430,'Primary treatment on ink.',13)
b+=rect(956,146,224,224,INK,48)+mark(IVORY,x=998,y=188,size=140)+label(956,402,'Primary app icon',18,700)+label(956,430,'Ivory, nickel, ink.',13)
b+=f'<path d="M48 458H1232" stroke="{RULE}"/>'+label(48,494,'Horizontal lockup',18,700)
b+=embed_lockup('horizontal',48,512)+label(48,670,'Inter 780 / optical size 32 / 60px mark / 38px cap / 20px gap',12)
b+=label(690,494,'App icon masks',18,700)
for i,(name,shape) in enumerate([('Square','square'),('Rounded','round'),('Circle','circle')]):
    x=690+i*174;y=526;s=128
    b+=(f'<circle cx="{x+64}" cy="{y+64}" r="64" fill="{INK}"/>' if shape=='circle' else rect(x,y,s,s,INK,28 if shape=='round' else 0))
    b+=mark(IVORY,x=x+24,y=y+24,size=80)+label(x,y+151,name,12)
b+=f'<path d="M48 704H1232" stroke="{RULE}"/>'+label(48,744,'One small-size derivative',18,700)
b+=label(48,774,'The 16px favicon aligns vertical edges and strengthens the nickel return.',14)
b+=label(48,802,'Canonical geometry continues at 24px and above, in lockups and all app icons.',14)
b+=label(48,866,'SVG / PNG / ICO / Apple asset catalog / macOS ICNS / maskable web icons',14,700)
b+=label(48,899,'App sources are opaque squares. Rounded corners appear only in these previews.',12,color='#62686D')
src=write('proofs/asset-overview.svg',doc(b,W,H));render(src,'proofs/asset-overview.png')

# Pixel proof is assembled from the exported PNGs at exact 1:1 size.
font_path='/System/Library/Fonts/Supplemental/Arial.ttf'
def font(s): return ImageFont.truetype(font_path,s)
sheet=Image.new('RGB',(1100,640),IVORY);draw=ImageDraw.Draw(sheet)
draw.text((28,22),'Slab J at actual pixel sizes',font=font(28),fill=INK)
draw.text((28,62),'Inspect at 100%. Enlarged crops below use nearest-neighbor pixels.',font=font(14),fill=INK)
for row,(name,scheme,bg,fg) in enumerate([('Light','primary',IVORY,INK),('Dark','reversed',INK,IVORY),('Monochrome','monochrome',IVORY,INK)]):
    y=100+row*125;draw.rectangle((28,y,1072,y+114),fill=bg);draw.text((42,y+14),name,font=font(14),fill=fg)
    for x,s in zip([170,265,360,470,600],[16,24,32,48,96]):
        # The 96px sample spans the row height; its actual size remains 96px.
        py=y+(96-s)//2
        im=Image.open(ROOT/f'png/mark-{scheme}-{s}.png');sheet.paste(im,(x,py),im)
        draw.text((x,y+98),f'{s}px',font=font(11),fill=fg)
    name2='optical-16-reversed' if scheme=='reversed' else 'optical-16-monochrome' if scheme=='monochrome' else 'optical-16'
    im=Image.open(ROOT/f'png/{name2}.png');sheet.paste(im,(850,y+28),im)
    draw.text((802,y+98),'16px optical',font=font(11),fill=fg)
draw.text((28,490),'16px on light / 6x pixel enlargement',font=font(15),fill=INK)
for x,name,caption in [(420,'mark-primary-16','Selected A'),(660,'optical-16','Optical 16px')]:
    im=Image.open(ROOT/f'png/{name}.png').resize((96,96),Image.Resampling.NEAREST);sheet.paste(im,(x,520),im)
    draw.text((x+110,550),caption,font=font(14),fill=INK)
sheet.save(ROOT/'proofs/pixel-proof.png');GENERATED.append('proofs/pixel-proof.png')

# Context strip includes the exact approved Surfaces and kanban source geometry.
refs=ROOT/'references';refs.mkdir(exist_ok=True)
for name in ['surfaces','kanban']:
    assert (refs/f'{name}.svg').is_file(),f'Missing bundled family reference: {name}.svg'
b=rect(0,0,1280,350,IVORY)+label(48,54,'One family, three distinct marks',26,700)
for name,x,caption in [('surfaces',70,'surfaces.systems'),('kanban',460,'kanban.cards'),('judgmentkit',850,'JudgmentKit')]:
    if name=='judgmentkit': b+=mark(x=x+50,y=100,size=128)
    else:
        pts=[n.attrib['points'] for n in ET.parse(refs/f'{name}.svg').findall('.//s:polygon',NS)]
        b+=mark(x=x+50,y=100,size=128,parts=pts)
    b+=label(x+114,280,caption,20,700,anchor='middle')
b+=label(48,326,'Sharp filled planes. Open cuts. Nickel on the lower piece. Ink and ivory grounds.',14)
src=write('proofs/family-fit.svg',doc(b,1280,350));render(src,'proofs/family-fit.png')
radius=max(math.hypot(192+float(p.split(',')[0])*10-512,192+float(p.split(',')[1])*10-512) for points in PARTS for p in points.split())
assert radius<409.6
write('placement.json',json.dumps({'canonical_viewBox':[0,0,64,64],'app_canvas':1024,'mark_viewport':640,'translation':[192,192],'scale':10,'visible_bounds':[332,212,692,812],'safe_zone_radius':409.6,'maximum_mark_vertex_radius':radius,'safe_zone_margin':409.6-radius,'app_geometry_changes':'none'},indent=2)+'\n')
write('generated-files.json',json.dumps(sorted(set(GENERATED)),indent=2)+'\n')
print(f'Built {len(set(GENERATED))} outputs')
