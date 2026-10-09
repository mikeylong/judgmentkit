#!/usr/bin/env python3
"""Run still-unreached site, skill, and eval stages on final frozen bytes."""
from pathlib import Path
import hashlib
import json
import shlex
import subprocess
import time
TASK = Path('/private/tmp/judgmentkit-mcp-improvements-validation/attempt-4')
COPY = TASK / 'source'
RESULTS = TASK / 'results' / 'diagnostic-tail'
RESULTS.mkdir(exist_ok=False)
manifest = json.loads((TASK / 'results' / 'source-manifest.json').read_text())
outcomes = []
for index, command in enumerate(['npm run test:site', 'node tests/skills.test.mjs', 'node evals/run-evals.mjs']):
    log_path = RESULTS / f'{index:02d}.log'
    began = time.monotonic()
    with log_path.open('wb') as log:
        run = subprocess.run(shlex.split(command), cwd=COPY, stdout=log, stderr=subprocess.STDOUT)
    outcome = {'command': command, 'exit_code': run.returncode,
               'duration_seconds': round(time.monotonic() - began, 2), 'log': log_path.name,
               'log_sha256': hashlib.sha256(log_path.read_bytes()).hexdigest(),
               'source_manifest_sha256': manifest['source_manifest_sha256'],
               'scope': 'Diagnostic still-unreached npm-test stage on attempt-4 final snapshot; not a full-suite pass.'}
    outcomes.append(outcome)
    (RESULTS / 'checks.json').write_text(json.dumps(outcomes, indent=2) + '\n')
    print(json.dumps(outcome), flush=True)
    print(log_path.read_text(errors='replace')[-2200:], flush=True)
(RESULTS / 'summary.json').write_text(json.dumps({'scope': 'Diagnostic tail npm-test stages only, no full-suite acceptance.',
    'source_manifest_sha256': manifest['source_manifest_sha256'], 'checks': outcomes,
    'all_tail_stages_passed': all(x['exit_code'] == 0 for x in outcomes)}, indent=2) + '\n')
print(json.dumps({'complete': True, 'all_tail_stages_passed': all(x['exit_code'] == 0 for x in outcomes)}), flush=True)
