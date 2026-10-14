#!/usr/bin/env python3
"""Render the public social card from the exact approved outlined lockup.

Requires ImageMagick and macOS Georgia, as documented in specs/site-brand-assets.md.
The normal site build copies committed PNG output and needs neither renderer.
"""
from pathlib import Path
import hashlib
import html
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / 'site/brand-assets.json').read_text())
SOCIAL = CONFIG['social']
lockup = (ROOT / SOCIAL['lockup_source']).read_text()
x, y = SOCIAL['lockup_translation']
tx, ty = SOCIAL['tagline_position']
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="{html.escape(SOCIAL['alt'], quote=True)}">
  <rect width="1200" height="630" fill="{CONFIG['ivory']}"/>
  <g transform="translate({x} {y}) scale({SOCIAL['lockup_scale']})">
{lockup.rstrip()}
  </g>
  <text x="{tx}" y="{ty}" fill="{CONFIG['ink']}" font-family="Georgia, Times New Roman, serif" font-size="{SOCIAL['tagline_size']}" font-weight="400">{html.escape(SOCIAL['tagline'])}</text>
</svg>
'''
source = ROOT / 'site/assets/judgmentkit-social-thumbnail.svg'
target = ROOT / SOCIAL['source']
source.write_text(svg)
subprocess.run(['magick', '-font', '/System/Library/Fonts/Supplemental/Georgia.ttf',
                '-background', CONFIG['ivory'], '-density', '192', str(source),
                '-resize', '1200x630!', '-strip', '-colorspace', 'sRGB', '-alpha', 'off',
                f'PNG24:{target}'], check=True)
record = {
    'generator': 'scripts/build-site-brand-assets.py',
    'canonical_lockup': SOCIAL['lockup_source'],
    'canonical_lockup_sha256': hashlib.sha256(lockup.encode()).hexdigest(),
    'canvas': [1200, 630],
    'outputs': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [source, target]},
}
(ROOT / 'site/assets/brand-generation.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
