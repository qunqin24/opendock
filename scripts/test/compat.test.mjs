import test from 'node:test';
import assert from 'node:assert/strict';

import { detectCompat, detectSurfaces, rangeMajors, recentVersions } from '../lib/compat.mjs';

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
  assert.deepEqual(detectCompat({ peerDependencies: { '@opencode-ai/plugin': '^1' } }, '2026-10-01'), { target: 'v1', inferred: false });
  assert.deepEqual(detectCompat({ dependencies: { '@opencode/plugin': '^2' } }, '2026-10-01'), { target: 'v2', inferred: false });
  assert.deepEqual(
    detectCompat({ dependencies: { '@opencode-ai/sdk': '^1', '@opencode/client': '^2' } }, '2026-10-01'),
    { target: 'both', inferred: false },
  );
  assert.deepEqual(detectCompat({ engines: { opencode: '>=2' } }, '2026-10-01'), { target: 'v2', inferred: false });
  assert.deepEqual(detectCompat({ exports: { '.': './a.js', './v2': './b.js' } }, '2026-10-01'), { target: 'v2', inferred: false });
  assert.deepEqual(detectCompat({ keywords: ['OpenCode-V2'] }, '2026-10-01'), { target: 'v2', inferred: false });
});

test('detectCompat infers V1 only for releases that predate V2', () => {
  assert.deepEqual(detectCompat({}, '2026-08-30T10:00:00.000Z'), { target: 'v1', inferred: true });
  assert.deepEqual(detectCompat({}, '2026-09-20T10:00:00.000Z'), { target: null, inferred: false });
  assert.deepEqual(detectCompat(null, null), { target: null, inferred: false });
});

// Exports as published on npm by the packages named in issues #6 and #7.
test('detectSurfaces reads server, TUI and Desktop entries from exports', () => {
  // opencode-github-panel@0.2.3
  assert.deepEqual(detectSurfaces({ exports: { '.': './src/index.ts', './rpc': './src/rpc.ts', './gui-experimental': './dist/gui-experimental.cjs' } }), ['server', 'gui']);
  // opencode-cache-coach@0.7.0 (condition objects as values)
  assert.deepEqual(
    detectSurfaces({ exports: { '.': { default: './dist/index.js' }, './tui': { default: './dist/tui.js' }, './gui-experimental': { default: './dist/gui-experimental.cjs' } } }),
    ['server', 'tui', 'gui'],
  );
  // opencode-git-config-sync@0.1.3: TUI only
  assert.deepEqual(detectSurfaces({ exports: { './tui': './dist/tui.js' } }), ['tui']);
  // opencode-quick-links: terminal and Desktop UI, no server
  assert.deepEqual(detectSurfaces({ exports: { './gui-experimental': './a.cjs', './tui': './b.js' } }), ['tui', 'gui']);
  // opencode-notification@0.0.5 sends desktop notifications, but has no GUI entry
  assert.deepEqual(detectSurfaces({ exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } }, main: 'dist/index.js' }), ['server']);
  assert.deepEqual(detectSurfaces({ exports: { './server': './s.js', './tui': './t.js' } }), ['server', 'tui']);
  assert.deepEqual(detectSurfaces({ main: 'index.js' }), ['server']);
  assert.deepEqual(detectSurfaces({ exports: './index.js' }), ['server']);
  assert.deepEqual(detectSurfaces({ exports: { './plugins/a': './a.js' } }), ['server']);
  assert.deepEqual(detectSurfaces(null), []);
});

test('detectSurfaces counts a GUI entry only when it resolves to a JS bundle', () => {
  const gui = (entry) => detectSurfaces({ exports: { '.': './a.js', './gui-experimental': entry } }).includes('gui');
  assert.equal(gui('./dist/gui-experimental.cjs'), true);
  assert.equal(gui({ import: './dist/gui.js', types: './dist/gui.d.ts' }), true);
  assert.equal(gui({ bun: './gui.js' }), true);
  assert.equal(gui([{ types: './gui.d.ts' }, './gui.cjs']), true);
  assert.equal(gui('./src/gui.tsx'), false);
  assert.equal(gui({ types: './gui.d.ts' }), false);
  assert.equal(gui(null), false);
});

test('detectCompat counts a Desktop GUI entry as V2', () => {
  // @rizal72/oc-git@0.2.4 declares no SDK at all
  assert.deepEqual(
    detectCompat({ exports: { '.': './index.ts', './tui': './tui.js', './gui-experimental': './dist/gui-experimental.cjs' } }, '2026-11-20'),
    { target: 'v2', inferred: false },
  );
  assert.deepEqual(
    detectCompat({ peerDependencies: { '@opencode-ai/plugin': '*' }, exports: { '.': './a.js', './gui-experimental': './b.cjs' } }, '2026-11-01'),
    { target: 'both', inferred: false },
  );
  // A TUI entry alone says nothing about the major: V1 had TUI plugins too.
  assert.deepEqual(detectCompat({ exports: { './tui': './t.js' } }, '2026-11-01'), { target: null, inferred: false });
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
