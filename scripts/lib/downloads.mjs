import { getJSON, mapLimit } from './http.mjs';
import { setTimeout as delay } from 'node:timers/promises';

const validCount = (n) => Number.isSafeInteger(n) && n >= 0;

/** Optional enrichment: at most three minutes per period, then keep last-known values. */
export async function fetchDownloads(names, period, cache, {
  fallback = new Map(), budgetMs = 180_000, request = getJSON,
  paceMs = 120, log = console.log,
} = {}) {
  const signal = AbortSignal.timeout(budgetMs);
  const out = new Map();
  const pending = [];
  let cached = 0;
  let refreshed = 0;
  const fresh = new Set();
  for (const name of names) {
    const key = `${period}:${name}`;
    const hit = cache.get(key);
    if (validCount(hit)) {
      out.set(name, hit);
      cached++;
      fresh.add(name);
    } else {
      const stale = cache.getStale?.(key);
      const previous = validCount(stale) ? stale : fallback.get(name);
      if (validCount(previous)) out.set(name, previous);
      pending.push(name);
    }
  }

  const fetchChunk = async (chunk) => {
    if (signal.aborted) return;
    try {
      const data = await request(`https://api.npmjs.org/downloads/point/${period}/${chunk.join(',')}`, {
        retries: 1, timeoutMs: 10_000, maxRetryDelayMs: 3000, signal,
      });
      for (const name of chunk) {
        // The API returns a single object for one package, even when unscoped.
        const value = data?.package === name ? data : data?.[name];
        if (!validCount(value?.downloads)) continue;
        out.set(name, value.downloads);
        cache.set(`${period}:${name}`, value.downloads);
        fresh.add(name);
        refreshed++;
      }
    } catch {
      // Missing packages, rate limits, timeout and exhausted budget all retain
      // the fallback without marking it fresh or extending its cache timestamp.
    }
  };

  try {
    const plain = pending.filter((name) => !name.startsWith('@'));
    for (let i = 0; i < plain.length && !signal.aborted; i += 100) {
      await fetchChunk(plain.slice(i, i + 100));
    }
    let completed = 0;
    await mapLimit(pending.filter((name) => name.startsWith('@')), 2, async (name) => {
      if (signal.aborted) return;
      await fetchChunk([name]);
      if (++completed % 100 === 0) await cache.save();
      if (!signal.aborted && paceMs) {
        await delay(paceMs, undefined, { signal }).catch(() => {});
      }
    });
  } finally {
    await cache.save();
  }

  const retained = [...out.keys()].filter((name) => !fresh.has(name)).length;
  log(`${period}: ${refreshed} refreshed, ${cached} cached, ${retained} last-known, ${names.length - out.size} unavailable${signal.aborted ? ' (time budget reached)' : ''}`);
  return out;
}
