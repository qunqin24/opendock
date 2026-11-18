#!/usr/bin/env python3
"""Receive an Actions-built tar.gz over a restricted SSH key (no shell access)."""
import fcntl
import os
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import urllib.request

ROOT = Path('/srv/opendock')


def main():
    with (ROOT / '.deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        release = Path(tempfile.mkdtemp(prefix='release-', dir=ROOT / 'releases'))
        current = ROOT / 'current'
        previous = current.resolve() if current.exists() else None
        switched = False
        try:
            # Accept regular files/directories only; never archive links or traversal.
            total = 0
            with tarfile.open(fileobj=sys.stdin.buffer, mode='r|gz') as archive:
                for member in archive:
                    target = (release / member.name).resolve()
                    if not target.is_relative_to(release) or not (member.isfile() or member.isdir()):
                        raise ValueError('Unsafe archive member')
                    total += member.size
                    if total > 4 * 1024**3:
                        raise ValueError('Release exceeds 4 GiB')
                    archive.extract(member, release, filter='data')
            for name in ('index.html', 'zh/index.html', '404.html', 'search-index.json'):
                if not (release / name).is_file():
                    raise ValueError(f'Missing required file: {name}')
            for directory, dirs, files in os.walk(release):
                os.chmod(directory, 0o755)
                for name in files:
                    os.chmod(Path(directory) / name, 0o644)
            pending = ROOT / '.current-next'
            pending.unlink(missing_ok=True)
            pending.symlink_to(release.relative_to(ROOT))
            pending.replace(current)
            switched = True
            with urllib.request.urlopen('http://127.0.0.1:3090/', timeout=15) as response:
                if response.status != 200 or b'OpenDock' not in response.read():
                    raise RuntimeError('Live smoke test failed')
            print(f'Deployed {release.name}')
        except Exception:
            if switched and previous:
                pending = ROOT / '.current-next'
                pending.unlink(missing_ok=True)
                pending.symlink_to(previous.relative_to(ROOT))
                pending.replace(current)
            shutil.rmtree(release)
            raise
        # Keep recent releases (including the immediate rollback target).
        releases = sorted((ROOT / 'releases').glob('release-*'), key=lambda p: p.stat().st_mtime, reverse=True)
        for old in releases[3:]:
            if old not in (release, previous):
                shutil.rmtree(old)


if __name__ == '__main__':
    main()
