#!/usr/bin/env python3
"""Render the shared website icon and social contract from approved sources."""
from pathlib import Path
import hashlib
import html
import json
import math
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / 'site/brand-assets.json').read_text())
SOCIAL = CONFIG['social']
ICONS = CONFIG['web_icons']
GEOMETRY = json.loads((ROOT / ICONS['geometry_source']).read_text())
NS = {'s': 'http://www.w3.org/2000/svg'}
OUTPUTS = []


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(relative, value):
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value)
    OUTPUTS.append(target)
    return target


def render(source, target, size, opaque=False, density=None):
    subprocess.run(['magick', '-background', 'none', '-density', str(density or ICONS['raster_density']), str(source),
                    '-resize', f'{size[0]}x{size[1]}!', '-strip', '-colorspace', 'sRGB',
                    f'{"PNG24" if opaque else "PNG32"}:{target}'], check=True)
    OUTPUTS.append(target)


def vertices(parts):
    return [tuple(map(float, point.split(','))) for polygon in parts for point in polygon.split()]


def placement(parts, height):
    points = vertices(parts)
    left, right = min(x for x, y in points), max(x for x, y in points)
    top, bottom = min(y for x, y in points), max(y for x, y in points)
    scale = height / (bottom - top)
    x = ICONS['center'][0] - (left + right) * scale / 2
    y = ICONS['center'][1] - (top + bottom) * scale / 2
    return x, y, scale


def mark(parts, foreground, height, identifier='', monochrome=False):
    x, y, scale = placement(parts, height)
    polygons = ''.join(f'<polygon points="{points}" fill="{foreground if monochrome or i != 2 else CONFIG["nickel"]}"/>' for i, points in enumerate(parts))
    identifier_attribute = f' id="{identifier}"' if identifier else ""
    return f'<g{identifier_attribute} transform="translate({x:g} {y:g}) scale({scale:g})">{polygons}</g>'


def icon_svg(theme='light', height=None, radius=None, optical=False, responsive=False, monochrome=False):
    height = height if height is not None else ICONS['visible_mark_height']
    radius = radius if radius is not None else ICONS['browser_radius']
    background, foreground = (CONFIG['ivory'], CONFIG['ink']) if theme == 'light' else (CONFIG['ink'], CONFIG['ivory'])
    body = '' if monochrome else f'<rect width="64" height="64" rx="{radius:g}" fill="{background}"/>'
    if responsive:
        body += f'<style>#optical{{display:none}}@media(max-width:{ICONS["optical_max_size"]}px){{#canonical{{display:none}}#optical{{display:inline}}}}</style>'
        body += mark(GEOMETRY['canonical'], foreground, height, 'canonical') + mark(GEOMETRY['optical_16'], foreground, height, 'optical')
    else:
        body += mark(GEOMETRY['optical_16'] if optical else GEOMETRY['canonical'], '#000000' if monochrome else foreground, height, monochrome=monochrome)
    dimension = '100%' if responsive else '64'
    return f'<svg xmlns="{NS["s"]}" width="{dimension}" height="{dimension}" viewBox="0 0 64 64" role="img" data-visible-mark-height="{height:g}"><title>JudgmentKit Slab J</title>{body}</svg>\n'


# The approved masters and optical derivative remain unchanged.
assert [p.get('points') for p in ET.parse(ROOT / ICONS['master_source']).findall('.//s:polygon', NS)] == GEOMETRY['canonical']
lockup_path = ROOT / SOCIAL['lockup_source']
lockup = lockup_path.read_text()
contract = json.loads((ROOT / 'brand/slab-j/lockup-contract.json').read_text())
approved = next(a for a in contract['approved_assets'] if 'brand/slab-j/' + a['canonical_export'] == SOCIAL['lockup_source'])
assert digest(lockup_path) == approved['sha256']
social_width, social_height = map(float, ET.fromstring(lockup).get('viewBox').split()[2:])
scale = min(SOCIAL['maximum_scale'], SOCIAL['maximum_width'] / social_width)
x, y = (SOCIAL['width'] - social_width * scale) / 2, (SOCIAL['height'] - social_height * scale) / 2
social_svg = f'<svg xmlns="{NS["s"]}" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="{html.escape(SOCIAL["alt"], quote=True)}">\n  <rect width="1200" height="630" fill="{SOCIAL["background"]}"/>\n  <g transform="translate({x:.12f} {y:.12f}) scale({scale:.12f})">\n{lockup}  </g>\n</svg>\n'
source = write('site/assets/judgmentkit-social-thumbnail.svg', social_svg)
render(source, ROOT / SOCIAL['source'], (1200, 630), True, SOCIAL['raster_density'])

icons_dir = ROOT / ICONS['output_directory']
icons_dir.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='judgmentkit-web-icons-') as temporary:
    temporary = Path(temporary)
    for theme in ['light', 'dark']:
        write(f'{ICONS["output_directory"]}/favicon-{theme}.svg', icon_svg(theme, responsive=True))
        for size in [16, 32, 48]:
            source = temporary / f'{theme}-{size}.svg'
            source.write_text(icon_svg(theme, optical=size == 16))
            render(source, icons_dir / f'favicon-{theme}-{size}.png', (size, size))
    frames = [Image.open(icons_dir / f'favicon-{ICONS["fallback_theme"]}-{size}.png').convert('RGBA') for size in [16, 32, 48]]
    ico = icons_dir / 'favicon.ico'
    frames[-1].save(ico, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[:-1])
    OUTPUTS.append(ico)
    write(f'{ICONS["output_directory"]}/safari-pinned-tab.svg', icon_svg(monochrome=True))
    for name, height in [('app-icon', ICONS['visible_mark_height']), ('maskable', ICONS['maskable_visible_mark_height'])]:
        source = write(f'{ICONS["output_directory"]}/{name}.svg', icon_svg(theme=ICONS['fallback_theme'], height=height, radius=0))
        for size in ([180, 192, 512] if name == 'app-icon' else [192, 512]):
            target = icons_dir / ('apple-touch-icon.png' if size == 180 else f'{name}-{size}.png')
            render(source, target, (size, size), True)

mx, my, ms = placement(GEOMETRY['canonical'], ICONS['maskable_visible_mark_height'])
radius = max(math.hypot(mx + px * ms - 32, my + py * ms - 32) for px, py in vertices(GEOMETRY['canonical']))
assert radius < ICONS['maskable_safe_radius']
record = {
    'generator': 'scripts/build-site-brand-assets.py',
    'canonical_lockup': SOCIAL['lockup_source'],
    'canonical_lockup_sha256': digest(lockup_path),
    'sources': {p: digest(ROOT / p) for p in [ICONS['geometry_source'], ICONS['master_source'], 'site/brand-assets.json']},
    'canvas': [1200, 630],
    'social_placement': {'scale': scale, 'translation': [x, y], 'source_viewBox': [0, 0, social_width, social_height]},
    'web_icons': ICONS,
    'maskable_placement': {'visible_mark_height': ICONS['maskable_visible_mark_height'], 'translation': [mx, my], 'scale': ms, 'maximum_vertex_radius': radius, 'safe_radius': ICONS['maskable_safe_radius']},
    'outputs': {str(p.relative_to(ROOT)): digest(p) for p in OUTPUTS},
}
(ROOT / 'site/assets/brand-generation.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'outputs': len(OUTPUTS), 'social_png': str(ROOT / SOCIAL['source']), 'social_sha256': digest(ROOT / SOCIAL['source']), 'social_route': SOCIAL['route_prefix'] + '-' + digest(ROOT / SOCIAL['source'])[:16] + '.png'}, indent=2))
