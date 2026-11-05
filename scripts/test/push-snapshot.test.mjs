import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../push-snapshot.sh', import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'opendock-push-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git');
  const seed = path.join(root, 'seed');
  const checkout = path.join(root, 'checkout');
  const bin = path.join(root, 'bin');
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  };
  const git = (cwd, ...args) => run('git', args, { cwd, env });
  await git(root, 'init', '--bare', '--initial-branch=main', remote);
  await git(root, 'clone', remote, seed);
  await writeFile(path.join(seed, 'snapshot.json'), 'old\n');
  await git(seed, 'add', '.');
  await git(seed, 'commit', '-m', 'initial');
  await git(seed, 'push', 'origin', 'main');
  await git(root, 'clone', remote, checkout);
  await writeFile(path.join(checkout, 'snapshot.json'), 'new\n');
  await git(checkout, 'commit', '-am', 'snapshot');
  await mkdir(bin);
  // Exercise the real git operations, without waiting through retry backoff.
  await writeFile(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const push = () => run('bash', [script, 'main'], {
    cwd: checkout, env: { ...env, PATH: `${bin}:${env.PATH}` }, timeout: 10000,
  });
  const rejectPushes = async (count) => {
    await writeFile(path.join(remote, 'hooks/pre-receive'), `#!/bin/sh
count=$(cat attempts 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > attempts
if [ "$count" -le ${count} ]; then
  echo 'Internal Server Error' >&2
  exit 1
fi
`, { mode: 0o755 });
  };
  return { root, remote, seed, checkout, bin, git, push, rejectPushes };
}

test('pushes a snapshot normally', async (t) => {
  const f = await fixture(t);
  await f.push();
  assert.equal((await f.git(f.remote, 'show', 'main:snapshot.json')).stdout, 'new\n');
});

test('retries transient remote errors without repeating the crawl or commit', async (t) => {
  const f = await fixture(t);
  await f.rejectPushes(2);
  const before = (await f.git(f.checkout, 'rev-parse', 'HEAD')).stdout;
  await f.push();
  assert.equal(await readFile(path.join(f.remote, 'attempts'), 'utf8'), '3\n');
  assert.equal((await f.git(f.remote, 'rev-parse', 'main')).stdout, before);
});

test('fails after three rejected pushes and leaves the remote unchanged', async (t) => {
  const f = await fixture(t);
  await f.rejectPushes(3);
  await assert.rejects(f.push(), (error) => {
    assert.match(error.stderr, /Snapshot push failed after 3 attempts/);
    return true;
  });
  assert.equal(await readFile(path.join(f.remote, 'attempts'), 'utf8'), '3\n');
  assert.equal((await f.git(f.remote, 'show', 'main:snapshot.json')).stdout, 'old\n');
});

test('rebases again when a concurrent manual commit arrives during a failed push', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.seed, 'manual.txt'), 'keep this\n');
  await f.git(f.seed, 'add', '.');
  await f.git(f.seed, 'commit', '-m', 'manual');
  const realGit = (await run('which', ['git'])).stdout.trim();
  await writeFile(path.join(f.bin, 'git'), `#!/bin/sh
if [ "$1" = push ] && [ ! -f concurrent-push ]; then
  touch concurrent-push
  "${realGit}" -C "${f.seed}" push origin main || exit 1
  echo 'Simulated concurrent push rejection' >&2
  exit 1
fi
exec "${realGit}" "$@"
`, { mode: 0o755 });
  await f.push();
  assert.equal((await f.git(f.remote, 'show', 'main:manual.txt')).stdout, 'keep this\n');
  assert.equal((await f.git(f.remote, 'show', 'main:snapshot.json')).stdout, 'new\n');
});

test('stops on rebase conflicts rather than retrying or force-pushing', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.seed, 'snapshot.json'), 'manual change\n');
  await f.git(f.seed, 'commit', '-am', 'conflicting manual change');
  await f.git(f.seed, 'push', 'origin', 'main');
  await f.rejectPushes(0);
  await assert.rejects(f.push());
  await assert.rejects(readFile(path.join(f.remote, 'attempts')), { code: 'ENOENT' });
  assert.equal((await f.git(f.remote, 'show', 'main:snapshot.json')).stdout, 'manual change\n');
});

test('handles a successful push whose response was lost without duplicating commits', async (t) => {
  const f = await fixture(t);
  const realGit = (await run('which', ['git'])).stdout.trim();
  await writeFile(path.join(f.bin, 'git'), `#!/bin/sh
"${realGit}" "$@"
status=$?
if [ "$1" = push ] && [ "$status" = 0 ] && [ ! -f response-lost ]; then
  touch response-lost
  exit 1
fi
exit "$status"
`, { mode: 0o755 });
  await f.push();
  assert.equal((await f.git(f.remote, 'rev-list', '--count', 'main')).stdout, '2\n');
  assert.equal((await f.git(f.remote, 'show', 'main:snapshot.json')).stdout, 'new\n');
});
