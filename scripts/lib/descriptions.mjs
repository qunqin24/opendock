/**
 * Chinese descriptions for the plugin snapshot.
 *
 * `data/translations.json` is a committed, append-only cache:
 *     sha256(provider | target | normalised source)  →  translated text
 * Only successful translations are stored, so an unchanged description is
 * never requested twice and a failed run simply leaves gaps for the next one.
 * Nothing here may fail the pipeline: callers get `descriptionZh = null` for
 * anything that could not be translated.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { PROVIDER, DEFAULT_TARGET, MAX_CHARS, TranslatorStopped } from './translate.mjs';

/** Collapse whitespace so cosmetic edits don't invalidate the cache. */
export function normalizeSource(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function cacheKey(text, { provider = PROVIDER, target = DEFAULT_TARGET } = {}) {
  return createHash('sha256')
    .update(`${provider}\n${target}\n${normalizeSource(text)}`)
    .digest('hex')
    .slice(0, 24);
}

const CJK = /[㐀-䶿一-鿿豈-﫿]/gu;
const LATIN = /[A-Za-z]/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * Whether `text` is worth sending to the translator.
 * @returns {{ ok: true, text: string } | { ok: false, reason: 'empty'|'too-long'|'chinese'|'not-prose' }}
 */
export function classifyText(raw) {
  const text = normalizeSource(raw);
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > MAX_CHARS) return { ok: false, reason: 'too-long' };

  const cjk = text.match(CJK)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  // Already Chinese (or mostly): nothing to gain, and Bing may mangle mixed text.
  if (cjk >= 8 || (cjk > 0 && cjk / (cjk + latin) >= 0.25)) return { ok: false, reason: 'chinese' };

  const withoutUrls = text.replace(URL_RE, ' ').trim();
  const letters = withoutUrls.match(/\p{L}/gu)?.length ?? 0;
  if (letters < 2) return { ok: false, reason: 'not-prose' }; // URL only, symbols, emoji, numbers
  // A lone identifier-looking token ("opencode-foo", "@scope/pkg", "foo.bar") is a name, not prose.
  if (!/\s/.test(withoutUrls) && /[-_/.@:]/.test(withoutUrls)) return { ok: false, reason: 'not-prose' };

  return { ok: true, text };
}

export class TranslationCache {
  #file;
  #data = {};
  #dirty = false;

  constructor(file) {
    this.#file = file;
  }

  async load() {
    if (!existsSync(this.#file)) return this;
    try {
      const parsed = JSON.parse(await readFile(this.#file, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string' && v) this.#data[k] = v;
      }
    } catch {
      // A corrupt cache must not break the pipeline; it is rebuilt as we go.
      this.#data = {};
    }
    return this;
  }

  get(key) {
    return this.#data[key];
  }

  set(key, value) {
    if (typeof value !== 'string' || !value.trim()) return; // never cache failures
    this.#data[key] = value;
    this.#dirty = true;
  }

  get size() {
    return Object.keys(this.#data).length;
  }

  /** Sorted keys keep the committed file's diffs minimal and stable. */
  async save({ force = false } = {}) {
    if (!this.#dirty && !(force && !existsSync(this.#file))) return;
    const sorted = Object.fromEntries(Object.entries(this.#data).sort(([a], [b]) => (a < b ? -1 : 1)));
    await mkdir(path.dirname(this.#file), { recursive: true });
    await writeFile(this.#file, JSON.stringify(sorted, null, 0) + '\n');
    this.#dirty = false;
  }
}

/**
 * Resolves a Chinese description for every plugin.
 *
 * @param {{name:string, description:string|null}[]} plugins  in priority order (best-ranked first)
 * @param {object} o
 * @param {{translate:(t:string)=>Promise<string>, stopped:boolean, stopReason:string|null}|null} o.translator
 *        null → cache lookups only
 * @param {TranslationCache} o.cache
 * @param {number} [o.maxNew]      cap on new translations this run
 * @param {number} [o.budgetMs]    wall-clock cap for the translation phase
 * @returns {Promise<{ result: Map<string, string|null>, stats: object }>} result is keyed by plugin name
 */
export async function translateDescriptions(plugins, {
  translator,
  cache,
  maxNew = Infinity,
  budgetMs = Infinity,
  concurrency = 2,
  saveEvery = 25,
  log = () => {},
} = {}) {
  const started = Date.now();
  const stats = {
    total: plugins.length,
    cached: 0,
    translated: 0,
    failed: 0,
    unchanged: 0, // translator returned the source verbatim (names, jargon)
    skipped: { empty: 0, 'too-long': 0, chinese: 0, 'not-prose': 0 },
    deferred: 0, // eligible but not attempted (cap / budget / breaker)
    stopReason: null,
    ms: 0,
  };

  const result = new Map();
  /** key → { text, names[] } for descriptions that still need a request */
  const pending = new Map();

  for (const p of plugins) {
    const c = classifyText(p.description);
    if (!c.ok) {
      stats.skipped[c.reason]++;
      result.set(p.name, null);
      continue;
    }
    const key = cacheKey(c.text);
    const hit = cache.get(key);
    if (hit !== undefined) {
      stats.cached++;
      result.set(p.name, hit === c.text ? null : hit);
      continue;
    }
    result.set(p.name, null);
    const entry = pending.get(key);
    if (entry) entry.names.push(p.name);
    else pending.set(key, { text: c.text, names: [p.name] });
  }

  const queue = [...pending.entries()];
  let cursor = 0;
  let attempted = 0;
  let sinceSave = 0;
  const deadline = Number.isFinite(budgetMs) ? started + budgetMs : Infinity;

  const canContinue = () =>
    translator && !translator.stopped && attempted < maxNew && Date.now() < deadline && cursor < queue.length;

  const worker = async () => {
    while (canContinue()) {
      const [key, entry] = queue[cursor++];
      attempted++;
      try {
        const zh = (await translator.translate(entry.text)).trim();
        cache.set(key, zh);
        const same = zh === entry.text;
        if (same) stats.unchanged += entry.names.length;
        else stats.translated += entry.names.length;
        for (const n of entry.names) result.set(n, same ? null : zh);
        if (++sinceSave >= saveEvery) {
          sinceSave = 0;
          await cache.save().catch(() => {});
          log(`  translated ${stats.translated + stats.unchanged}/${queue.length} (${stats.failed} failed)`);
        }
      } catch (err) {
        if (err instanceof TranslatorStopped) break;
        stats.failed += entry.names.length;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(2, concurrency)) }, worker));
  await cache.save().catch(() => {});

  // Whatever the loop never reached or that was cut short by the breaker.
  const handled = stats.translated + stats.unchanged + stats.failed;
  const eligible = [...pending.values()].reduce((n, e) => n + e.names.length, 0);
  stats.deferred = Math.max(0, eligible - handled);
  stats.stopReason = translator?.stopReason ?? null;
  stats.ms = Date.now() - started;
  return { result, stats };
}

export function formatStats(s) {
  const skipped = Object.entries(s.skipped).filter(([, n]) => n).map(([k, n]) => `${k}:${n}`).join(' ') || 'none';
  return (
    `${s.total} plugins — cached ${s.cached}, translated ${s.translated}, unchanged-by-translator ${s.unchanged}, ` +
    `failed ${s.failed}, deferred ${s.deferred}, skipped ${skipped}` +
    (s.stopReason ? ` — translator stopped: ${s.stopReason}` : '') +
    ` (${(s.ms / 1000).toFixed(1)}s)`
  );
}
