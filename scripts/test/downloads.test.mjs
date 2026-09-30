import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fetchDownloads } from '../lib/downloads.mjs';
import { JSONCache } from '../lib/cache.mjs';

async function cache(t, entries = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'opendock-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'downloads.json');
  await writeFile(file, JSON.stringify(entries));
  return new JSONCache(file, 20).load();
}
const quiet = { paceMs: 0, log: () => {} };

test('bulk, singleton unscoped and scoped payloads, including true zero', async (t) => {
  const c = await cache(t);
  const names = [...Array.from({ length: 101 }, (_, i) => `plain-${i}`), '@scope/pkg'];
  const calls = [];
  const result = await fetchDownloads(names, 'last-week', c, {
    ...quiet,
    request: async (url) => {
      const packages = url.split('/last-week/')[1].split(',');
      calls.push(packages);
      if (packages.length === 1) return { package: packages[0], downloads: 0 };
      return Object.fromEntries(packages.map((name) => [name, { downloads: 7 }]));
    },
  });
  assert.deepEqual(calls.map((chunk) => chunk.length), [100, 1, 1]);
  assert.equal(result.size, names.length);
  assert.equal(result.get('plain-100'), 0);
  assert.equal(result.get('@scope/pkg'), 0);
  assert.equal(c.get('last-week:plain-100'), 0);
});

test('fresh cache wins; errors retain expired cache then snapshot without re-caching', async (t) => {
  const expired = Date.now() - 21 * 3_600_000;
  const c = await cache(t, {
    'last-month:fresh': { t: Date.now(), v: 0 },
    'last-month:stale': { t: expired, v: 42 },
  });
  let requested;
  const result = await fetchDownloads(['fresh', 'stale', 'snapshot', 'new'], 'last-month', c, {
    ...quiet,
    fallback: new Map([['fresh', 999], ['stale', 123], ['snapshot', 88]]),
    request: async (url) => { requested = url; throw new Error('429'); },
  });
  assert.ok(!requested.includes('fresh'));
  assert.deepEqual([...result], [['fresh', 0], ['stale', 42], ['snapshot', 88]]);
  assert.equal(c.get('last-month:stale'), undefined);
  assert.equal(c.get('last-month:snapshot'), undefined);
  assert.equal(c.getStale('last-month:stale'), 42);
});

test('invalid or missing counts do not overwrite last-known values', async (t) => {
  const c = await cache(t);
  const result = await fetchDownloads(['negative', 'string', 'missing', 'valid'], 'last-week', c, {
    ...quiet,
    fallback: new Map([['negative', 1], ['string', 2], ['missing', 3], ['valid', 4]]),
    request: async () => ({ negative: { downloads: -1 }, string: { downloads: '5' }, valid: { downloads: 0 } }),
  });
  assert.deepEqual([...result.values()], [1, 2, 3, 0]);
});

test('budget cancels in-flight requests and skips hundreds of queued packages', async (t) => {
  const c = await cache(t);
  const names = Array.from({ length: 500 }, (_, i) => `@scope/p${i}`);
  let requests = 0;
  const started = Date.now();
  const result = await fetchDownloads(names, 'last-week', c, {
    ...quiet, budgetMs: 40, fallback: new Map(names.map((name) => [name, 10])),
    request: async (_url, { signal }) => {
      requests++;
      // A referenced timer models a socket that stays open until aborted.
      return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
      });
    },
  });
  assert.equal(requests, 2);
  assert.equal(result.size, 500);
  assert.ok(Date.now() - started < 1000);
});
