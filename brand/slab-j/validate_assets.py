#!/usr/bin/env python3
"""Validate exported source geometry, dimensions and icon-container pixels."""
from pathlib import Path
import hashlib,json,re,xml.etree.ElementTree as ET
from PIL import Image
from tools.validate_lockups import validate_lockups

ROOT=Path(__file__).resolve().parent
NS={'s':'http://www.w3.org/2000/svg'}
G=json.loads((ROOT/'geometry.json').read_text())
P=G['canonical'];O=G['optical_16'];checks=[]
def check(name,condition,detail=None):
    checks.append({'check':name,'passed':bool(condition),**({'detail':detail} if detail is not None else {})})
    assert condition,name
def pts(path):return [p.attrib['points'] for p in ET.parse(path).findall('.//s:polygon',NS)]
check('Master matches selected A source',pts(ROOT/'judgmentkit.svg')==pts(ROOT/'source/selected-a.svg')==P)
check('Master palette keeps nickel on return',[p.attrib['fill'] for p in ET.parse(ROOT/'judgmentkit.svg').findall('.//s:polygon',NS)]==['#0B0D0E','#0B0D0E','#8B9096'])
svg_files=list(ROOT.rglob('*.svg'))
for path in svg_files:
    tree=ET.parse(path);rel=str(path.relative_to(ROOT))
    check(f'SVG syntax: {rel}',tree.getroot().tag=='{http://www.w3.org/2000/svg}svg')
    if rel.startswith(('references/','wordmark-source/','proofs/')):continue
    expected=P+O if rel=='favicon/favicon.svg' else O if 'optical-16' in rel or rel in ['favicon/favicon-16-light.svg','favicon/favicon-16-dark.svg','favicon/source-16.svg'] else P
    if rel=='app-icons/composer/background.svg':expected=[]
    check(f'Geometry: {rel}',pts(path)==expected)
    if rel.startswith('lockups/'):
        check(f'Outlined wordmark: {rel}',len(tree.findall('.//s:path',NS))==11 and not tree.findall('.//s:text',NS))
    check(f'No external dependencies: {rel}',not re.search(r'(?:href|src)=[\"\'](?:https?:|file:|data:)',path.read_text()))

expected_sizes={}
for path in (ROOT/'png').glob('*.png'):
    s=16 if path.stem.startswith('optical-16') else int(path.stem.split('-')[-1]);expected_sizes[path]=(s,s)
for path in (ROOT/'app-icons').rglob('*.png'):
    if '.iconset' in str(path):
        m=re.search(r'icon_(\d+)x\d+(@2x)?',path.stem);s=int(m.group(1))*(2 if m.group(2) else 1)
    elif '.appiconset' in str(path):s=1024
    elif path.stem=='apple-touch-icon':s=180
    else:s=int(path.stem.split('-')[-1])
    expected_sizes[path]=(s,s)
for path in (ROOT/'favicon').glob('*.png'):
    s=int(path.stem.split('-')[-1]);expected_sizes[path]=(s,s)
for path,size in expected_sizes.items():
    with Image.open(path) as im:
        check(f'PNG dimensions: {path.relative_to(ROOT)}',im.size==size)
        if 'app-icons/' in str(path) or '/favicon/' in str(path):check(f'Opaque PNG: {path.relative_to(ROOT)}',im.mode=='RGB')
        else:check(f'Transparent PNG: {path.relative_to(ROOT)}',im.mode=='RGBA' and im.getextrema()[3][0]==0)

ico=Image.open(ROOT/'favicon/favicon.ico')
check('ICO frame sizes',ico.ico.sizes()=={(16,16),(32,32),(48,48)})
for s in [16,32,48]:
    expected=Image.open(ROOT/f'favicon/favicon-{s}.png').convert('RGBA')
    check(f'ICO {s}px exact pixels',ico.ico.getimage((s,s)).convert('RGBA').tobytes()==expected.tobytes())
icns=Image.open(ROOT/'app-icons/macos/judgmentkit.icns')
frames=icns.info['sizes']
for frame in frames:
    im=icns.icns.getimage(frame).convert('RGBA');s=frame[0]*frame[2]
    check(f'ICNS {frame} exact pixels',im.size==(s,s) and im.tobytes()==Image.open(ROOT/f'app-icons/app-icon-{s}.png').convert('RGBA').tobytes())
check('ICNS includes 1024px frame',any(f[0]*f[2]==1024 for f in frames))
contents=json.loads((ROOT/'app-icons/apple/AppIcon.appiconset/Contents.json').read_text())
check('Apple catalog references source PNG',contents['images']==[{'filename':'AppIcon-1024.png','idiom':'universal','platform':'ios','size':'1024x1024'}])
placement=json.loads((ROOT/'placement.json').read_text())
check('Maskable safe circle',placement['maximum_mark_vertex_radius']<placement['safe_zone_radius'],placement)
check('Motion honors reduced motion','prefers-reduced-motion:reduce' in (ROOT/'svg/mark-motion.svg').read_text())
validate_lockups(ROOT,check)
result={'status':'passed','check_count':len(checks),'checks':checks,'canonical_source_sha256':hashlib.sha256((ROOT/'source/selected-a.svg').read_bytes()).hexdigest(),'visual_review':{'reviewed':['proofs/asset-overview.png','proofs/pixel-proof.png','proofs/family-fit.png','proofs/lockups.png'],'canonical_fidelity':'Exact selected A polygons preserved across canonical exports.','optical_16':'Crisper vertical edges and stronger nickel return after direct light, dark and monochrome inspection. Broken-J or hook reading remains possible.','app_masks':'Square, rounded-square, circle and central safe-circle retain all three pieces.','minimum_app_tile':'16px app tile contains a roughly 9px-tall mark; recognition is weaker than the full-canvas optical favicon.'},'lockup_contract':'lockup-contract.json','lockup_review':'Approved horizontal files are exact; Inter 780 outlines and horizontal/stacked measurements verified.','browser_verification':{'receipt':'browser-verification.json','scope':'Earlier favicon checks; horizontal and stacked lockups verified by current asset checks.'},'apple_catalog_compiler':'apple-catalog-validation.json','product_integration':'Not applied'}
(ROOT/'validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'Passed {len(checks)} checks across {len(svg_files)} SVGs and {len(expected_sizes)} PNGs')
