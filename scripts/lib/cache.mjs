import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Dead-simple on-disk JSON cache.
 *
 * The crawl makes ~1500 npm requests and ~50 GitHub GraphQL batches. Without
 * a cache, any failure — or any tweak to the scoring code — means paying for
 * the whole crawl again. Entries are keyed by name and expire by age, so a
 * re-run within the TTL only fetches what's genuinely missing.
 */
export class JSONCache {
  #file;
  #ttl;
  #data = {};
  #dirty = false;

  /** @param {string} file @param {number} ttlHours */
  constructor(file, ttlHours = 20) {
    this.#file = file;
    this.#ttl = ttlHours * 3_600_000;
  }

  async load() {
    if (!existsSync(this.#file)) return this;
    try {
      this.#data = JSON.parse(await readFile(this.#file, 'utf8'));
    } catch {
      this.#data = {};
    }
    return this;
  }

  get(key) {
    const entry = this.#data[key];
    if (!entry) return undefined;
    if (Date.now() - entry.t > this.#ttl) return undefined;
    return entry.v;
  }

  set(key, value) {
    this.#data[key] = { t: Date.now(), v: value };
    this.#dirty = true;
  }

  get size() {
    return Object.keys(this.#data).length;
  }

  async save() {
    if (!this.#dirty) return;
    await mkdir(path.dirname(this.#file), { recursive: true });
    await writeFile(this.#file, JSON.stringify(this.#data));
    this.#dirty = false;
  }
}
