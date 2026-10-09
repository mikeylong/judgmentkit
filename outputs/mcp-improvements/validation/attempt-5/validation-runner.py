#!/usr/bin/env python3
"""Validate a byte-identical local source copy without weakening export guards."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

SOURCE = Path('/Users/mike/.codex/worktrees/mcp-improvements/JudgmentKit2')
TASK_BASE = Path('/private/tmp/judgmentkit-mcp-improvements-validation')
ATTEMPT = sys.argv[1] if len(sys.argv) > 1 else None
if ATTEMPT is not None and (not ATTEMPT.startswith('attempt-') or not ATTEMPT[8:].isdigit()):
    raise ValueError('Expected an attempt-N subdirectory.')
TASK = TASK_BASE / ATTEMPT if ATTEMPT else TASK_BASE
TASK.mkdir(parents=True, exist_ok=True)
COPY = TASK / 'source'
RESULTS = TASK / 'results'
PROOF_PREFIX = 'outputs/mcp-improvements/'
VALIDATION_PREFIX = PROOF_PREFIX + 'validation/'
DEPENDENCIES = Path('/Users/mike/JudgmentKit2/node_modules')
COMMANDS = [('npm-test', ['npm', 'test']),
            ('site-build', ['npm', 'run', 'site:build']),
            ('benchmark', ['npm', 'run', 'benchmark']),
            ('mcp-smoke', ['npm', 'run', 'mcp:smoke'])]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')

def names():
    raw = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=SOURCE)
    return sorted(set(x.decode() for x in raw.split(b'\0') if x))

def inventory(root=SOURCE, paths=None):
    files = []
    omissions = []
    for name in names() if paths is None else paths:
        p = root / name
        parts = Path(name).parts
        reason = None
        if '.git' in parts or 'node_modules' in parts:
            reason = 'git metadata or dependency tree'
        elif name.startswith(VALIDATION_PREFIX):
            reason = 'validation self output excluded from recursive identity'
        elif any(part in ('__pycache__', '.DS_Store', '.playwright-cli', '.vercel', '.nyc_output', 'coverage') for part in parts):
            reason = 'runtime junk'
        elif any((root / Path(*parts[:i])).is_symlink() for i in range(1, len(parts) + 1)):
            reason = 'symlink excluded'
        elif not p.is_file():
            reason = 'nonfile or deleted tracked file'
        if reason:
            omissions.append({'path': name, 'reason': reason})
            continue
        data = p.read_bytes()
        files.append({'path': name, 'bytes': len(data), 'sha256': sha(data),
                      'scope': 'generated_proof' if name.startswith(PROOF_PREFIX) else 'source'})
    return files, omissions

def identity(files, scope=None):
    entries = [x for x in files if scope is None or x['scope'] == scope]
    return sha(json.dumps(entries, separators=(',', ':'), sort_keys=True).encode())

def changed(expected, current):
    old = {x['path']: x for x in expected if x['scope'] == 'source'}
    new = {x['path']: x for x in current if x['scope'] == 'source'}
    return sorted(name for name in old.keys() | new.keys() if old.get(name) != new.get(name))

def snapshot():
    if COPY.exists():
        raise RuntimeError('Disposable source copy already exists; preserve evidence and use a new task subdirectory for a later source revision.')
    RESULTS.mkdir(exist_ok=True)
    source_files, omissions = inventory()
    for entry in source_files:
        p = COPY / entry['path']
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SOURCE / entry['path'], p)
    (COPY / 'node_modules').symlink_to(DEPENDENCIES, target_is_directory=True)
    copied, copy_omissions = inventory(COPY, [x['path'] for x in source_files])
    source_after, _ = inventory()
    mutations = changed(source_files, source_after)
    if mutations:
        raise RuntimeError('Source changed during snapshot: ' + ', '.join(mutations))
    if copied != source_files:
        raise RuntimeError('Source and copied bytes differ.')
    selected_browser = os.environ.get('JUDGMENTKIT_COMPONENT_CHROME_PATH')
    browser_environment = {'component_browser_selection': 'default_supported_backend',
                           'test_timeouts_and_assertions': 'unchanged'}
    if selected_browser:
        browser_path = Path(selected_browser)
        browser_environment.update({'component_browser_selection': 'explicit_supported_component_path',
                                    'JUDGMENTKIT_COMPONENT_CHROME_PATH': selected_browser,
                                    'executable_exists': browser_path.is_file(),
                                    'executable_sha256': sha(browser_path.read_bytes()) if browser_path.is_file() else None})
    manifest = {'source_root': str(SOURCE), 'validation_root': str(COPY),
                'source_base_sha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=SOURCE, text=True).strip(),
                'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=SOURCE, text=True).strip(),
                'files': source_files, 'omissions': omissions,
                'source_manifest_sha256': identity(source_files, 'source'),
                'generated_proof_manifest_sha256': identity(source_files, 'generated_proof'),
                'full_manifest_sha256': identity(source_files),
                'copy_verified_equal': True,
                'validation_runner_sha256': sha(Path(__file__).read_bytes()),
                'execution_environment': browser_environment,
                'dependency_symlink': {'path': str(COPY / 'node_modules'), 'target': str(DEPENDENCIES)},
                'security_guard': 'Managed .codex worktree remains excluded by slide-export workspace policy; tests use exact source bytes in disposable local directory.'}
    write_json(RESULTS / 'source-manifest.json', manifest)
    return manifest

def validate(manifest):
    outcomes = []
    for label, argv in COMMANDS:
        before, _ = inventory()
        mutations = changed(manifest['files'], before)
        if mutations:
            write_json(RESULTS / 'source-drift.json', {'stage': 'before-' + label, 'changed_paths': mutations})
            raise RuntimeError('Executable/config/test/spec/contract/doc source changed before ' + label + ': ' + ', '.join(mutations))
        log_path = RESULTS / (label + '.log')
        start = time.monotonic()
        with log_path.open('wb') as log:
            result = subprocess.run(argv, cwd=COPY, stdout=log, stderr=subprocess.STDOUT)
        after, _ = inventory()
        mutations = changed(manifest['files'], after)
        outcome = {'command': ' '.join(argv), 'exit_code': result.returncode,
                   'duration_seconds': round(time.monotonic() - start, 2),
                   'log': log_path.name, 'log_sha256': sha(log_path.read_bytes()),
                   'source_unchanged': not mutations, 'source_changed_paths': mutations,
                   'source_manifest_sha256': manifest['source_manifest_sha256'],
                   'generated_proof_manifest_sha256_after': identity(after, 'generated_proof')}
        outcomes.append(outcome)
        write_json(RESULTS / 'checks.json', outcomes)
        print(json.dumps(outcome), flush=True)
        print(log_path.read_text(errors='replace')[-1800:], flush=True)
        if mutations:
            raise RuntimeError('Source changed during ' + label + ': ' + ', '.join(mutations))
    final, _ = inventory()
    summary = {'scope': 'Current local source integration validation; no hosted CI, merge, publish, or fresh model generation.',
               'source_manifest_sha256': manifest['source_manifest_sha256'],
               'full_snapshot_manifest_sha256': manifest['full_manifest_sha256'],
               'copy_verified_equal': True,
               'all_checks_passed': all(x['exit_code'] == 0 for x in outcomes),
               'checks': outcomes,
               'final_source_unchanged': not changed(manifest['files'], final),
               'generated_proof_updated_during_checks': identity(final, 'generated_proof') != manifest['generated_proof_manifest_sha256'],
               'excluded_validation_own_outputs': VALIDATION_PREFIX,
               'execution_environment': manifest['execution_environment'],
               'omissions': manifest['omissions']}
    write_json(RESULTS / 'summary.json', summary)
    print(json.dumps({'complete': True, 'all_checks_passed': summary['all_checks_passed'], 'results': str(RESULTS)}), flush=True)

if __name__ == '__main__':
    manifest = snapshot()
    print(json.dumps({key: manifest[key] for key in ('source_manifest_sha256', 'full_manifest_sha256', 'copy_verified_equal')}), flush=True)
    validate(manifest)
