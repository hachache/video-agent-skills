#!/usr/bin/env python3
"""Install the pinned video skills with the system skill installer."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

import yaml

SKILL = Path(__file__).resolve().parents[1]
RECEIPT = '.video-stack-origin.json'
ALLOWED = {'name', 'description', 'license', 'allowed-tools', 'metadata'}


def load_lock(path):
    lock = json.loads(Path(path).read_text())
    if lock.get('version') != 1 or not isinstance(lock.get('groups'), list):
        raise ValueError('unsupported video stack lock file')
    names = set()
    for group in lock['groups']:
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', group['repository']):
            raise ValueError('invalid repository')
        if not re.fullmatch(r'[a-f0-9]{40}', group['ref']):
            raise ValueError('sources must be pinned to a complete commit SHA')
        for path, name in entries(group):
            if path.startswith('/') or '..' in PurePosixPath(path).parts:
                raise ValueError('skill path must stay inside its repository')
            if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) or name in names:
                raise ValueError('invalid or duplicate skill name: ' + name)
            names.add(name)
    return lock


def entries(group):
    return [(path, group.get('name') or PurePosixPath(path).name) for path in group['paths']]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def normalize(folder):
    """Adapt client metadata without changing the upstream production workflow."""
    path = Path(folder) / 'SKILL.md'
    original = path.read_text()
    match = re.match(r'^---\n(.*?)\n---(?:\n|$)', original, re.S)
    if not match:
        raise ValueError('missing skill frontmatter: ' + str(folder))
    front = yaml.safe_load(match.group(1))
    if not isinstance(front, dict) or not isinstance(front.get('name'), str) or not isinstance(front.get('description'), str):
        raise ValueError('invalid skill metadata: ' + str(folder))
    if front['name'] != Path(folder).name:
        raise ValueError('skill name does not match its directory: ' + str(folder))
    changed = sorted(set(front) - ALLOWED)
    explicit_only = front.get('disable-model-invocation') is True
    for key in changed:
        front.setdefault('metadata', {})[key] = front.pop(key)
    if '<' in front['description'] or '>' in front['description'] or len(front['description']) > 1024:
        raise ValueError('skill description needs a reviewed compatibility edit: ' + str(folder))
    if changed:
        (Path(folder) / '.video-stack-upstream-skill.txt').write_text(original)
        path.write_text('---\n' + yaml.safe_dump(front, sort_keys=False, allow_unicode=True).rstrip() + '\n---\n' + original[match.end():])
    if explicit_only:
        agent = Path(folder) / 'agents/openai.yaml'
        data = yaml.safe_load(agent.read_text()) if agent.exists() else {}
        data = data or {}
        data.setdefault('policy', {})['allow_implicit_invocation'] = False
        agent.parent.mkdir(parents=True, exist_ok=True)
        agent.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True))
    return changed


def write_receipt(folder, group, source_path, changes):
    folder = Path(folder)
    files = {str(path.relative_to(folder)).replace(os.sep, '/'): digest(path)
             for path in sorted(folder.rglob('*')) if path.is_file() and path.name != RECEIPT}
    receipt = {'version': 1, 'repository': group['repository'], 'ref': group['ref'],
               'source_path': source_path, 'metadata_edits': changes, 'files': files}
    (folder / RECEIPT).write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')


def check_one(folder, group, source_path):
    folder = Path(folder)
    if not folder.exists():
        return 'missing'
    receipt_path = folder / RECEIPT
    if not receipt_path.is_file():
        return 'existing-unmanaged'
    receipt = json.loads(receipt_path.read_text())
    if any(receipt.get(key) != value for key, value in [('repository', group['repository']), ('ref', group['ref']), ('source_path', source_path)]):
        return 'different-version'
    for relative, expected in receipt.get('files', {}).items():
        if Path(relative).is_absolute() or '..' in PurePosixPath(relative).parts:
            return 'invalid-receipt'
        file = folder / relative
        if not file.is_file() or digest(file) != expected:
            return 'local-changes'
    return 'ready' if receipt.get('files') else 'invalid-receipt'


def inspect(destination, lock):
    return {name: check_one(Path(destination) / name, group, source_path)
            for group in lock['groups'] for source_path, name in entries(group)}


def install(destination, lock, installer, staging=None):
    destination = Path(destination).expanduser().resolve()
    states = inspect(destination, lock)
    conflicts = {name: state for name, state in states.items() if state not in ('ready', 'missing')}
    if conflicts:
        raise ValueError('preserving existing skills; review these differences before replacing: ' + json.dumps(conflicts))
    if all(state == 'ready' for state in states.values()):
        return states
    if not Path(installer).is_file():
        raise ValueError('system skill installer not found; pass --installer /path/to/install-skill-from-github.py')
    with tempfile.TemporaryDirectory(prefix='video-stack-') as temporary:
        source = Path(staging).resolve() if staging else Path(temporary) / 'staged'
        source.mkdir(parents=True, exist_ok=True)
        pending = []
        for group in lock['groups']:
            selected = [(path, name) for path, name in entries(group) if states[name] == 'missing']
            if not selected:
                continue
            if not staging:
                command = [sys.executable, str(installer), '--repo', group['repository'], '--ref', group['ref'],
                           '--path', *[path for path, name in selected], '--dest', str(source), '--method', group.get('method', 'download')]
                if group.get('name'):
                    command += ['--name', group['name']]
                subprocess.run(command, check=True)
            license_text = None
            if group.get('license_path'):
                url = 'https://raw.githubusercontent.com/{}/{}/{}'.format(group['repository'], group['ref'], group['license_path'])
                with urllib.request.urlopen(url, timeout=30) as response:
                    license_text = response.read()
            for source_path, name in selected:
                folder = source / name
                changes = normalize(folder)
                if license_text:
                    (folder / '.video-stack-upstream-license.txt').write_bytes(license_text)
                write_receipt(folder, group, source_path, changes)
                pending.append((folder, destination / name))
        # Validate all staged skills before touching the destination. Nothing is
        # installed by executing a repository's own shell scripts or npm hooks.
        destination.mkdir(parents=True, exist_ok=True)
        installed = []
        try:
            for folder, target in pending:
                if target.exists():
                    raise ValueError('destination appeared during install: ' + str(target))
                target.mkdir()
                installed.append(target)
                shutil.copytree(folder, target, dirs_exist_ok=True)
        except Exception:
            for target in installed:
                shutil.rmtree(target)
            raise
    return inspect(destination, lock)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lock', type=Path, default=SKILL / 'stack.lock.json')
    home = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex'))
    parser.add_argument('--dest', type=Path, default=home / 'skills')
    parser.add_argument('--installer', type=Path, default=home / 'skills/.system/skill-installer/scripts/install-skill-from-github.py')
    parser.add_argument('--staging', type=Path, help='use a reviewed download instead of downloading again')
    parser.add_argument('--check', action='store_true', help='verify local versions and files without network access')
    args = parser.parse_args()
    lock = load_lock(args.lock)
    result = inspect(args.dest, lock) if args.check else install(args.dest, lock, args.installer, args.staging)
    print(json.dumps(result, indent=2))
    return 0 if all(state == 'ready' for state in result.values()) else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
