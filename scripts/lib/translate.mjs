/**
 * Build-time client for Bing's *unofficial* web translator endpoint.
 *
 *   GET  https://www.bing.com/translator   → IG / IID / key / token
 *   POST https://www.bing.com/ttranslatev3 → [{ translations: [{ text }] }]
 *
 * None of this is a supported API: markup and parameters can change, and
 * Bing may throttle or put a challenge in front of it at any time. So the
 * client is built around "fail soft and stop early":
 *
 *   - every request has a hard timeout (covers the body read too);
 *   - credentials are cached and shared — concurrent callers wait on one
 *     in-flight page fetch;
 *   - a failed request refreshes credentials once and retries once, never loops;
 *   - errors that Bing returns with HTTP 200 are detected, not cached;
 *   - 403 / 429 / HTML challenge pages / captcha flags trip a circuit breaker:
 *     from then on every call throws `TranslatorStopped` without touching the
 *     network, so one bad response ends the run instead of being hammered;
 *   - requests are paced (small concurrency + minimum spacing).
 *
 * Browsers never talk to Bing; this only runs in the Node pipeline.
 */

import { setTimeout as delay } from 'node:timers/promises';

export const PROVIDER = 'bing';
export const PAGE_URL = 'https://www.bing.com/translator';
export const API_URL = 'https://www.bing.com/ttranslatev3';
export const DEFAULT_TARGET = 'zh-Hans';
export const MAX_CHARS = 1000;

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; OpenDockBuild/1.0; +https://github.com/opendock)',
  'accept-language': 'en-US,en;q=0.9',
};

/** The circuit breaker is open: stop translating for the rest of this run. */
export class TranslatorStopped extends Error {
  name = 'TranslatorStopped';
}

/** One text failed; the translator itself may still be healthy. */
export class TranslateError extends Error {
  name = 'TranslateError';
}

const CHALLENGE = /captcha|unusual traffic|verify (that )?you are|are you a (human|robot)|access denied|\/turing\//i;

/**
 * Pulls the per-session values out of the translator page.
 * Returns null when any of them is missing (markup changed or a challenge page).
 */
export function extractCredentials(html) {
  if (typeof html !== 'string') return null;
  const ig = html.match(/\bIG\s*:\s*"([A-Za-z0-9]+)"/)?.[1] ?? html.match(/"ig"\s*:\s*"([^"]+)"/i)?.[1];
  const iids = [...html.matchAll(/data-iid\s*=\s*["']([^"']+)["']/gi)];
  const iid = iids.at(-1)?.[1];
  const helper = html.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"(?:\s*,\s*(\d+))?/);
  const key = helper?.[1];
  const token = helper?.[2];
  if (!ig || !iid || !key || !token) return null;
  return { ig, iid, key, token, ttlMs: helper[3] ? Number(helper[3]) : null };
}

/**
 * Validates a ttranslatev3 payload that arrived with HTTP 200.
 * Returns `{ text }` on success, `{ stop: reason }` when the payload says we
 * are throttled/challenged, and throws TranslateError for any other malformed
 * or error payload (worth one credential refresh, then give up on that text).
 */
export function parseTranslation(payload) {
  const stop = stopReasonOf(payload);
  if (stop) return { stop };
  if (!Array.isArray(payload)) {
    const code = payload?.statusCode ?? payload?.errorCode ?? payload?.error;
    throw new TranslateError(`Bing returned an error payload${code ? ` (${code})` : ''}: ${preview(payload)}`);
  }
  const text = payload[0]?.translations?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new TranslateError(`unexpected Bing response: ${preview(payload)}`);
  }
  return { text };
}

/** Payloads that mean "you are being throttled / challenged", not "this text failed". */
function stopReasonOf(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (payload.ShowCaptcha || payload.showCaptcha) return 'Bing asked for a captcha';
  if (Number(payload.statusCode) === 429 || Number(payload.errorCode) === 429) return 'Bing rate-limited the client (429 in payload)';
  if (Number(payload.statusCode) === 403) return 'Bing refused the client (403 in payload)';
  return null;
}

const preview = (v) => JSON.stringify(v)?.slice(0, 200) ?? String(v);

export class BingTranslator {
  #fetch;
  #timeoutMs;
  #intervalMs;
  #concurrency;
  #ttlMs;
  #maxFailures;
  #sleep;

  #creds = null;
  #inflight = null;
  #stopReason = null;
  #failuresInRow = 0;
  #active = 0;
  #waiting = [];
  #nextSlot = 0;

  stats = { requests: 0, ok: 0, failed: 0, credentialFetches: 0 };

  /**
   * @param {object} [o]
   * @param {typeof fetch} [o.fetch]            injectable for tests
   * @param {number} [o.timeoutMs=10000]
   * @param {number} [o.intervalMs=700]         minimum spacing between request starts
   * @param {number} [o.concurrency=2]          capped at 2
   * @param {number} [o.credentialTtlMs=300000]
   * @param {number} [o.maxConsecutiveFailures=5] per-text failures in a row before stopping
   * @param {(ms:number)=>Promise<void>} [o.sleep]
   */
  constructor({
    fetch: fetchImpl,
    timeoutMs = 10_000,
    intervalMs = 700,
    concurrency = 2,
    credentialTtlMs = 5 * 60_000,
    maxConsecutiveFailures = 5,
    sleep = (ms) => delay(ms),
  } = {}) {
    this.#fetch = fetchImpl;
    this.#timeoutMs = timeoutMs;
    this.#intervalMs = intervalMs;
    this.#concurrency = Math.max(1, Math.min(2, concurrency));
    this.#ttlMs = credentialTtlMs;
    this.#maxFailures = maxConsecutiveFailures;
    this.#sleep = sleep;
  }

  /** Non-null once the circuit breaker has opened. */
  get stopReason() {
    return this.#stopReason;
  }

  get stopped() {
    return this.#stopReason !== null;
  }

  async translate(text, { to = DEFAULT_TARGET, from = 'auto-detect' } = {}) {
    if (typeof text !== 'string' || !text.trim()) throw new TranslateError('empty text');
    if (text.length > MAX_CHARS) throw new TranslateError(`text longer than ${MAX_CHARS} characters`);
    this.#assertRunning();

    return this.#limited(async () => {
      this.#assertRunning();
      let lastErr;
      let failedCreds = null;
      // Attempt 0 uses cached credentials; attempt 1 refreshes them. Never more.
      for (let attempt = 0; attempt < 2; attempt++) {
        let creds = null;
        try {
          creds = await this.#credentials(failedCreds);
          const out = await this.#post(creds, text, to, from);
          this.#failuresInRow = 0;
          this.stats.ok++;
          return out;
        } catch (err) {
          if (err instanceof TranslatorStopped) throw err;
          lastErr = err;
          failedCreds = creds ?? failedCreds;
          if (creds && this.#creds === creds) this.#creds = null;
        }
      }
      this.stats.failed++;
      if (++this.#failuresInRow >= this.#maxFailures) {
        throw this.#trip(`${this.#failuresInRow} translations failed in a row (last: ${lastErr.message})`);
      }
      throw lastErr instanceof TranslateError ? lastErr : new TranslateError(lastErr?.message ?? String(lastErr));
    });
  }

  // ------------------------------------------------------------ internals

  #assertRunning() {
    if (this.#stopReason) throw new TranslatorStopped(this.#stopReason);
  }

  #trip(reason) {
    this.#stopReason ??= reason;
    this.#creds = null;
    return new TranslatorStopped(this.#stopReason);
  }

  async #limited(fn) {
    if (this.#active >= this.#concurrency) await new Promise((resolve) => this.#waiting.push(resolve));
    else this.#active++;
    try {
      return await fn();
    } finally {
      const next = this.#waiting.shift();
      if (next) next(); // hand the slot over without releasing it
      else this.#active--;
    }
  }

  /** Reserves the next start slot so requests are at least `intervalMs` apart. */
  async #pace() {
    const now = Date.now();
    const slot = Math.max(now, this.#nextSlot);
    this.#nextSlot = slot + this.#intervalMs;
    if (slot > now) await this.#sleep(slot - now);
    this.#assertRunning();
  }

  async #request(url, init) {
    const doFetch = this.#fetch ?? globalThis.fetch;
    this.stats.requests++;
    let res;
    try {
      res = await doFetch(url, { ...init, signal: AbortSignal.timeout(this.#timeoutMs) });
    } catch (err) {
      throw new TranslateError(`request failed: ${err?.name === 'TimeoutError' ? 'timeout' : (err?.message ?? err)}`);
    }
    if (res.status === 403 || res.status === 429) {
      await res.body?.cancel().catch(() => {});
      throw this.#trip(`Bing answered HTTP ${res.status}`);
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new TranslateError(`HTTP ${res.status}`);
    }
    return res;
  }

  /**
   * Shared credential fetch. `stale` is the credentials object that just failed:
   * if another caller has already replaced it, reuse that instead of refetching.
   */
  async #credentials(stale = null) {
    const fresh = this.#creds && this.#creds !== stale && Date.now() < this.#creds.expiresAt;
    if (fresh) return this.#creds;
    if (this.#inflight) return this.#inflight;

    this.#inflight = (async () => {
      this.#assertRunning();
      this.stats.credentialFetches++;
      const res = await this.#request(PAGE_URL, { headers: HEADERS });
      let html;
      try {
        html = await res.text();
      } catch (err) {
        throw new TranslateError(`translator page read failed: ${err?.message ?? err}`);
      }
      const found = extractCredentials(html);
      if (!found) {
        // A page we can't parse will fail for every text — don't keep asking.
        throw this.#trip(CHALLENGE.test(html) ? 'Bing served a challenge page' : 'could not parse Bing translator page (markup changed?)');
      }
      const ttl = Math.min(found.ttlMs ?? this.#ttlMs, this.#ttlMs);
      this.#creds = { ...found, expiresAt: Date.now() + ttl };
      return this.#creds;
    })().finally(() => {
      this.#inflight = null;
    });
    return this.#inflight;
  }

  async #post(creds, text, to, from) {
    await this.#pace();
    const url = new URL(API_URL);
    url.searchParams.set('IG', creds.ig);
    url.searchParams.set('IID', creds.iid);
    const res = await this.#request(url, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        referer: PAGE_URL,
      },
      body: new URLSearchParams({ fromLang: from, to, text, key: creds.key, token: creds.token }),
    });

    let raw;
    try {
      raw = await res.text();
    } catch (err) {
      throw new TranslateError(`response read failed: ${err?.message ?? err}`);
    }
    if (/html/i.test(res.headers?.get?.('content-type') ?? '') || /^\s*</.test(raw)) {
      throw this.#trip(CHALLENGE.test(raw) ? 'Bing served a challenge page' : 'Bing answered with HTML instead of JSON');
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new TranslateError(`non-JSON response: ${raw.slice(0, 120)}`);
    }
    const parsed = parseTranslation(payload);
    if (parsed.stop) throw this.#trip(parsed.stop);
    return parsed.text;
  }
}
