#!/usr/bin/env python3
"""Create a reproducible ZIP and verify its contents against disk."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parent
NAME='judgmentkit-slab-j-assets.zip'
excluded={NAME,'package-validation.json','SHA256SUMS.txt','.DS_Store'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name not in excluded and '__pycache__' not in p.parts)
lines=[f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}' for p in files]
(ROOT/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n');files.append(ROOT/'SHA256SUMS.txt')
with zipfile.ZipFile(ROOT/NAME,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(files):
        info=zipfile.ZipInfo('judgmentkit-slab-j/'+str(p.relative_to(ROOT)),(2026,10,14,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
        z.writestr(info,p.read_bytes())
with zipfile.ZipFile(ROOT/NAME) as z:
    assert z.testzip() is None
    for p in files:assert z.read('judgmentkit-slab-j/'+str(p.relative_to(ROOT)))==p.read_bytes()
result={'status':'passed','archive':NAME,'files':len(files),'bytes':(ROOT/NAME).stat().st_size,'sha256':hashlib.sha256((ROOT/NAME).read_bytes()).hexdigest(),'verification':'CRC passed; every archived byte matches source file'}
(ROOT/'package-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
