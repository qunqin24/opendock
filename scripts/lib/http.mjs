import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const UA = 'OpenDock/1.0 (+https://github.com/opendock; opencode plugin directory)';

let cachedToken;
/** Prefer CI's GITHUB_TOKEN, fall back to the local `gh` CLI so dev runs aren't rate-limited. */
export function githubToken() {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  if (!cachedToken) {
    try {
      cachedToken = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
    } catch {
      cachedToken = null;
    }
  }
  return cachedToken;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** JSON fetch with bounded attempts (including body reads) and abortable backoff. */
export async function getJSON(url, {
  headers = {}, retries = 4, allow404 = true, timeoutMs = 20_000,
  maxRetryDelayMs = 30_000, signal,
} = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    signal?.throwIfAborted();
    let retryDelay = 400 * 2 ** attempt;
    try {
      const attemptSignal = AbortSignal.timeout(timeoutMs);
      const res = await fetch(url, {
        headers: { 'user-agent': UA, ...headers },
        signal: signal ? AbortSignal.any([signal, attemptSignal]) : attemptSignal,
      });
      if (res.status === 404 && allow404) {
        await res.body?.cancel();
        return null;
      }
      if (!res.ok) {
        await res.body?.cancel();
        const err = new Error(`${res.status} ${res.statusText} for ${url}`);
        // Permanent client failures should not consume the retry budget.
        if (res.status !== 429 && res.status < 500) throw Object.assign(err, { permanent: true });
        lastErr = err;
        const raw = res.headers.get('retry-after');
        const seconds = raw === null ? NaN : Number(raw);
        const retryAfter = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(raw) - Date.now();
        retryDelay = retryAfter > 0 ? retryAfter : (res.status === 429 ? 3000 : 500) * 2 ** attempt;
      } else {
        return await res.json();
      }
    } catch (err) {
      if (signal?.aborted) throw signal.reason;
      if (err.permanent) throw err;
      lastErr = err;
    }
    // No unnecessary sleep after the final failure; a stage abort interrupts sleep too.
    if (attempt < retries) await delay(Math.min(retryDelay, maxRetryDelayMs), undefined, { signal });
  }
  throw lastErr ?? new Error(`failed: ${url}`);
}

export async function graphql(query, variables = {}) {
  const token = githubToken();
  if (!token) throw new Error('No GitHub token. Set GITHUB_TOKEN or run `gh auth login`.');

  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'user-agent': UA,
          authorization: `bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      const body = await res.json();
      // Partial errors are expected: deleted/renamed repos resolve to null.
      if (body.errors?.some((e) => e.type === 'RATE_LIMITED')) {
        await sleep(30_000);
        continue;
      }
      return body.data ?? {};
    } catch (err) {
      // Long batched queries hit transient connect/read timeouts; retry them
      // rather than losing the whole crawl.
      lastErr = err;
      await sleep(2000 * 2 ** attempt);
    }
  }
  throw new Error(`GitHub GraphQL: exhausted retries (${lastErr?.message ?? 'unknown'})`);
}

/** Runs `worker` over `items` with bounded concurrency, preserving order. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}
