#!/usr/bin/env python3
"""Retry an environmental browser timeout once without changing the snapshot."""
from pathlib import Path
import hashlib
import json
import subprocess
import time
TASK = Path('/private/tmp/judgmentkit-mcp-improvements-validation/attempt-4')
COPY = TASK / 'source'
RESULTS = TASK / 'results' / 'browser-retry'
RESULTS.mkdir(exist_ok=False)
manifest = json.loads((TASK / 'results' / 'source-manifest.json').read_text())
argv = ['npm', 'run', 'test:components:browser']
log_path = RESULTS / 'component-browser.log'
started = time.monotonic()
with log_path.open('wb') as log:
    result = subprocess.run(argv, cwd=COPY, stdout=log, stderr=subprocess.STDOUT)
summary = {'command': ' '.join(argv), 'exit_code': result.returncode,
    'duration_seconds': round(time.monotonic() - started, 2), 'log': log_path.name,
    'log_sha256': hashlib.sha256(log_path.read_bytes()).hexdigest(),
    'source_manifest_sha256': manifest['source_manifest_sha256'],
    'scope': 'One focused retry after unchanged Chrome Runtime.evaluate timeout; source and harness timeout remain unchanged. Not a full-suite pass.'}
(RESULTS / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary), flush=True)
print(log_path.read_text(errors='replace')[-3500:], flush=True)
