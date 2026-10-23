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
