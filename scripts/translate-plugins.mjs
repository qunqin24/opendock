#!/usr/bin/env node
/**
 * Fills `descriptionZh` in src/data/plugins.json without re-crawling npm/GitHub,
 * so it can run locally with no tokens:
 *
 *   pnpm translate              apply data/translations.json (no network)
 *   pnpm translate --online     also translate what is missing (what CI does)
 *   pnpm translate --online --limit 20   stop after 20 new translations
 *
 * Off GitHub Actions it never calls Bing unless asked to with `--online`: the
 * backlog is drained by the daily refresh workflow, not on someone's laptop.
 *
 * The translator is an unofficial web endpoint. If it blocks us the run stops
 * early, keeps whatever succeeded, and exits 0 — it must never fail a pipeline.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BingTranslator } from './lib/translate.mjs';
import { TranslationCache, translateDescriptions, formatStats } from './lib/descriptions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS_FILE = path.join(ROOT, 'src', 'data', 'plugins.json');
const TRANSLATIONS_FILE = path.join(ROOT, 'data', 'translations.json');

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const limit = arg('--limit') === undefined ? Infinity : Number(arg('--limit'));
const offline = process.argv.includes('--offline') || (process.env.GITHUB_ACTIONS !== 'true' && !process.argv.includes('--online'));
const log = (...a) => console.log('›', ...a);

/** Re-keys a plugin so `descriptionZh` sits right after `description`, as the crawler writes it. */
function withZh(plugin, zh) {
  const out = {};
  for (const [k, v] of Object.entries(plugin)) {
    if (k === 'descriptionZh') continue;
    out[k] = v;
    if (k === 'description') out.descriptionZh = zh;
  }
  if (!('descriptionZh' in out)) out.descriptionZh = zh;
  return out;
}

async function main() {
  const snapshot = JSON.parse(await readFile(PLUGINS_FILE, 'utf8'));
  const cache = await new TranslationCache(TRANSLATIONS_FILE).load();
  const translator = offline ? null : new BingTranslator();

  log(`${snapshot.plugins.length} plugins, ${cache.size} cached translations${offline ? ' (offline)' : ''}`);
  const { result, stats } = await translateDescriptions(snapshot.plugins, { translator, cache, maxNew: limit, log });
  await cache.save({ force: true });

  snapshot.plugins = snapshot.plugins.map((p) => withZh(p, result.get(p.name) ?? null));
  await writeFile(PLUGINS_FILE, JSON.stringify(snapshot, null, 2));

  const withZhCount = snapshot.plugins.filter((p) => p.descriptionZh).length;
  log(formatStats(stats));
  log(`${withZhCount}/${snapshot.plugins.length} plugins now have descriptionZh → src/data/plugins.json`);
}

main().catch((err) => {
  // Same contract as the pipeline: translation problems never fail the job.
  console.error('translate: unexpected error —', err?.message ?? err);
  process.exit(0);
});
