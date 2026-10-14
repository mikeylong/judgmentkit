"""Check the approved lockup contract independently from its builder."""
from pathlib import Path
import hashlib,json,math,re,subprocess,tempfile,xml.etree.ElementTree as ET
from PIL import Image
NS={'s':'http://www.w3.org/2000/svg'}

def path_bounds(paths):
    # CoreText exports absolute M/L/Q/C/Z commands. Include true curve extrema.
    values=[[],[]]
    def add(point):
        for axis in (0,1):values[axis].append(point[axis])
    def roots(a,b,c):
        if abs(a)<1e-14:return [] if abs(b)<1e-14 else [-c/b]
        d=b*b-4*a*c
        if d<0:return []
        return [(-b+math.sqrt(d))/(2*a),(-b-math.sqrt(d))/(2*a)]
    for path in paths:
        tokens=re.findall(r'[MLQCZ]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?',path)
        i=0;current=(0,0);start=current
        while i<len(tokens):
            cmd=tokens[i];i+=1
            assert cmd in ('M','L','Q','C','Z'),f'Unsupported SVG command: {cmd}'
            if cmd=='Z':current=start;add(current);continue
            count={'M':2,'L':2,'Q':4,'C':6}[cmd]
            coords=list(map(float,tokens[i:i+count]));i+=count
            points=[tuple(coords[j:j+2]) for j in range(0,count,2)]
            if cmd in ('M','L'):
                current=points[-1];add(current)
                if cmd=='M':start=current
                continue
            control=[current]+points;add(control[0]);add(control[-1])
            for axis in (0,1):
                p=[v[axis] for v in control]
                if cmd=='Q':
                    den=p[0]-2*p[1]+p[2]
                    candidates=[] if abs(den)<1e-14 else [(p[0]-p[1])/den]
                else:
                    candidates=roots(-p[0]+3*p[1]-3*p[2]+p[3],2*(p[0]-2*p[1]+p[2]),p[1]-p[0])
                for t in candidates:
                    if 0<t<1:
                        if cmd=='Q':value=(1-t)**2*p[0]+2*(1-t)*t*p[1]+t*t*p[2]
                        else:value=(1-t)**3*p[0]+3*(1-t)**2*t*p[1]+3*(1-t)*t*t*p[2]+t**3*p[3]
                        values[axis].append(value)
            current=points[-1]
    return [min(values[0]),min(values[1]),max(values[0]),max(values[1])]

def transform(group):
    match=re.fullmatch(r'translate\(([-+\d.eE]+) ([-+\d.eE]+)\) scale\(([-+\d.eE]+)\)',group.attrib['transform'])
    assert match,'Lockups require one uniform scale and translation'
    return tuple(map(float,match.groups()))

def moved(bounds,t):
    x,y,s=t
    return [x+bounds[0]*s,y+bounds[1]*s,x+bounds[2]*s,y+bounds[3]*s]

def close(a,b):return abs(a-b)<1e-5

def validate_lockups(root,check):
    contract=json.loads((root/'lockup-contract.json').read_text())
    metadata=json.loads((root/'wordmark-source/metrics.json').read_text())
    check('Inter 780 / optical size 32 / no fallback',metadata['fontFamily']=='Inter' and metadata['weightAxis']==780 and metadata['opticalSizeAxis']==32 and metadata['fallbackRuns']==0)
    source_paths=[p.attrib['d'] for p in ET.parse(root/'wordmark-source/judgmentkit-wordmark.svg').findall('s:path',NS)]
    digest=hashlib.sha256('\n'.join(source_paths).encode()).hexdigest()
    check('Wordmark glyph outlines match approved fingerprint',digest==contract['font']['glyph_path_digest'])
    source_bounds=path_bounds(source_paths)
    ink=metadata['inkBounds']
    check('Actual glyph bounds match source metrics',all(close(a,b) for a,b in zip(source_bounds,[ink['x'],ink['y'],ink['x']+ink['width'],ink['y']+ink['height']])),source_bounds)
    for reference in contract['approved_assets']:
        original=root/reference['immutable_reference'];export=root/reference['canonical_export']
        check('Immutable approved bytes: '+reference['immutable_reference'],hashlib.sha256(original.read_bytes()).hexdigest()==reference['sha256'])
        check('Canonical approved bytes: '+reference['canonical_export'],export.read_bytes()==original.read_bytes())
    canonical=json.loads((root/'geometry.json').read_text())['canonical']
    for name in ['horizontal','horizontal-reversed','horizontal-monochrome','stacked','stacked-reversed']:
        tree=ET.parse(root/f'lockups/{name}.svg').getroot()
        mark=tree.find('s:g[@data-role="mark"]',NS);word=tree.find('s:g[@data-role="wordmark"]',NS)
        check('Inter metadata: '+name,[tree.attrib.get(k) for k in ['data-font-family','data-font-weight','data-font-optical-size']]==['Inter','780','32'])
        paths=[p.attrib['d'] for p in word.findall('s:path',NS)]
        check('Exact approved glyph paths: '+name,paths==source_paths and not tree.findall('.//s:text',NS))
        polygons=mark.findall('s:polygon',NS)
        check('Exact Slab J planes: '+name,[p.attrib['points'] for p in polygons]==canonical)
        points=[tuple(map(float,xy.split(','))) for polygon in polygons for xy in polygon.attrib['points'].split()]
        bounds=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]
        mark_bounds=moved(bounds,transform(mark));word_t=transform(word);word_bounds=moved(path_bounds(paths),word_t)
        width,height=list(map(float,tree.attrib['viewBox'].split()))[2:]
        cap=metadata['capHeight']*word_t[2]
        check('60-unit visible mark and 38-unit cap: '+name,close(mark_bounds[3]-mark_bounds[1],60) and close(cap,38))
        margins=[min(mark_bounds[0],word_bounds[0]),min(mark_bounds[1],word_bounds[1]),width-max(mark_bounds[2],word_bounds[2]),height-max(mark_bounds[3],word_bounds[3])]
        check('Minimum 24-unit outer padding: '+name,min(margins)>=24-1e-5,margins)
        if name.startswith('horizontal'):
            check('Horizontal 20-unit ink gap: '+name,close(word_bounds[0]-mark_bounds[2],20))
            check('Horizontal baseline 73 and cap/mark center 54: '+name,close(word_t[1],73) and close(word_t[1]-cap/2,54) and close((mark_bounds[1]+mark_bounds[3])/2,54))
        else:
            check('Stacked 20-unit vertical ink gap: '+name,close(word_bounds[1]-mark_bounds[3],20))
            check('Stacked centered ink bounds: '+name,close((mark_bounds[0]+mark_bounds[2])/2,width/2) and close((word_bounds[0]+word_bounds[2])/2,width/2))
        color='#F7F6F2' if name.endswith('reversed') else '#0B0D0E'
        palette=[p.attrib['fill'] for p in polygons]
        check('Primary nickel / correct theme: '+name,palette==[color,color,color if name.endswith('monochrome') else '#8B9096'] and word.attrib['fill']==color)
        png=root/f'lockups/{name}.png'
        im=Image.open(png).convert('RGBA')
        expected=(round(width*4),round(height*4))
        check('4x transparent raster dimensions: '+name,im.size==expected and im.getextrema()[3][0]==0,{'actual':im.size,'expected':expected})
        pixel_bounds=im.getchannel('A').getbbox()
        check('Raster bounds inside canvas: '+name,pixel_bounds[0]>0 and pixel_bounds[1]>0 and pixel_bounds[2]<im.width and pixel_bounds[3]<im.height)
        with tempfile.TemporaryDirectory(prefix='judgmentkit-lockup-validate-') as d:
            rendered=Path(d)/'rendered.png'
            subprocess.run(['magick','-background','none','-density','384',str(root/f'lockups/{name}.svg'),str(rendered)],check=True,capture_output=True)
            check('SVG render matches PNG pixels: '+name,im.tobytes()==Image.open(rendered).convert('RGBA').tobytes())
