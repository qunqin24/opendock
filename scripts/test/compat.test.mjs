import test from 'node:test';
import assert from 'node:assert/strict';

import { detectCompat, rangeMajors, recentVersions } from '../lib/compat.mjs';

test('rangeMajors reads the engine ranges plugins actually declare', () => {
  assert.deepEqual(rangeMajors('^1.0.0'), { v1: true, v2: false });
  assert.deepEqual(rangeMajors('>=2'), { v1: false, v2: true });
  assert.deepEqual(rangeMajors('1.x || 2.x'), { v1: true, v2: true });
  assert.deepEqual(rangeMajors('>=1.4 <2'), { v1: true, v2: false });
  assert.deepEqual(rangeMajors('>=1.0.0'), { v1: true, v2: true });
  assert.deepEqual(rangeMajors('~2.1'), { v1: false, v2: true });
  assert.equal(rangeMajors(''), null);
  assert.equal(rangeMajors(undefined), null);
});

test('detectCompat prefers SDK dependencies, then engines, exports and keywords', () => {
  assert.deepEqual(detectCompat({ peerDependencies: { '@opencode-ai/plugin': '^1' } }, '2026-10-01'), { target: 'v1', inferred: false, desktop: false });
  assert.deepEqual(detectCompat({ dependencies: { '@opencode/plugin': '^2' } }, '2026-10-01'), { target: 'v2', inferred: false, desktop: false });
  assert.deepEqual(
    detectCompat({ dependencies: { '@opencode-ai/sdk': '^1', '@opencode/client': '^2' } }, '2026-10-01'),
    { target: 'both', inferred: false, desktop: false },
  );
  assert.deepEqual(detectCompat({ engines: { opencode: '>=2' } }, '2026-10-01'), { target: 'v2', inferred: false, desktop: false });
  assert.deepEqual(detectCompat({ exports: { '.': './a.js', './v2': './b.js' } }, '2026-10-01'), { target: 'v2', inferred: false, desktop: false });
  assert.deepEqual(detectCompat({ keywords: ['OpenCode-V2'] }, '2026-10-01'), { target: 'v2', inferred: false, desktop: false });
});

test('detectCompat infers V1 only for releases that predate V2', () => {
  assert.deepEqual(detectCompat({}, '2026-08-30T10:00:00.000Z'), { target: 'v1', inferred: true, desktop: false });
  assert.deepEqual(detectCompat({}, '2026-09-20T10:00:00.000Z'), { target: null, inferred: false, desktop: false });
  assert.deepEqual(detectCompat(null, null), { target: null, inferred: false, desktop: false });
});

// Relevant exports from pinned npm manifests; tests do not contact the registry.
for (const [label, exports] of [
  ['opencode-github-panel@0.2.3', { '.': './src/index.ts', './rpc': './src/rpc.ts', './gui-experimental': './dist/gui-experimental.cjs' }],
  ['@rizal72/oc-git@0.2.4', { '.': './index.ts', './tui': './tui.js', './gui-experimental': './dist/gui-experimental.cjs' }],
  ['opencode-cache-coach@0.7.0', { './gui-experimental': { default: './dist/gui-experimental.cjs' } }],
  ['opencode-session-explorer-desktop@0.2.0', { '.': './dist/index.js', './tui': './dist/tui.js', './gui-experimental': './dist/gui-experimental.cjs' }],
]) {
  test(`detectCompat recognizes the Desktop GUI export in ${label}`, () => {
    assert.deepEqual(detectCompat({ exports }, null), { target: 'v2', inferred: false, desktop: true });
  });
}

test('detectCompat does not confuse Desktop notifications or a TUI export with a Desktop GUI', () => {
  const notificator = {
    description: 'OpenCode plugin for desktop notifications in TUI',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  }; // opencode-notification@0.0.5
  assert.equal(detectCompat(notificator, null).desktop, false);
  assert.equal(detectCompat({ exports: { './tui': './dist/tui.js' }, keywords: ['opencode-desktop'] }, null).desktop, false);
  for (const entry of [
    null, './src/gui.ts', { types: './dist/gui.d.cts' }, { browser: './dist/gui.js' },
    { node: null, default: './dist/gui.cjs' }, ['./src/gui.ts', './dist/gui.cjs'],
  ]) {
    assert.equal(detectCompat({ exports: { './gui-experimental': entry } }, null).desktop, false);
  }
});

test('a GUI export adds V2 support without erasing an existing V1 signal', () => {
  const manifest = {
    dependencies: { '@opencode-ai/plugin': '^1' },
    exports: { './gui-experimental': './dist/gui.js' },
  };
  assert.deepEqual(detectCompat(manifest, null), { target: 'both', inferred: false, desktop: true });
});

test('recentVersions lists versions newest first without the created/modified stamps', () => {
  const time = {
    created: '2026-01-01T00:00:00Z',
    modified: '2026-03-01T00:00:00Z',
    '1.0.0': '2026-01-01T00:00:00Z',
    '1.1.0': '2026-02-01T00:00:00Z',
    '1.2.0': '2026-03-01T00:00:00Z',
  };
  assert.deepEqual(recentVersions(time, 2), [
    { v: '1.2.0', t: '2026-03-01T00:00:00Z' },
    { v: '1.1.0', t: '2026-02-01T00:00:00Z' },
  ]);
});
