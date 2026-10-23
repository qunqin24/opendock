#!/usr/bin/env node
/**
 * Submits the pages a data refresh changed to IndexNow. Run by the daily
 * refresh workflow after it pushes a new snapshot:
 *
 *   node scripts/indexnow.mjs --previous <old plugins.json> [--dry-run]
 *
 * It first waits for the new snapshot to be live (Vercel deploys on push),
 * so engines that fetch straight away don't get yesterday's pages.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { INDEXNOW_ENDPOINT, changedUrls, payload } from './lib/indexnow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const SITE = arg('--site', process.env.SITE_URL ?? 'https://www.opendock.net');
const WAIT_MINUTES = Number(arg('--wait-minutes', 15));
const DRY_RUN = process.argv.includes('--dry-run');
const log = (...a) => console.log('›', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The key is the name (and content) of the one 32-hex .txt file in public/. */
async function readKey() {
  const files = await readdir(path.join(ROOT, 'public'));
  const file = files.find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!file) throw new Error('no IndexNow key file (public/<32 hex>.txt)');
  return (await readFile(path.join(ROOT, 'public', file), 'utf8')).trim();
}

async function waitForDeploy(generatedAt) {
  const deadline = Date.now() + WAIT_MINUTES * 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SITE}/snapshot.json`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
      if (res.ok && (await res.json()).generatedAt === generatedAt) return true;
    } catch {
      // Not deployed yet, or a blip: keep waiting.
    }
    await sleep(30_000);
  }
  return false;
}

async function main() {
  const next = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'plugins.json'), 'utf8'));
  const prevFile = arg('--previous');
  const previous = prevFile ? JSON.parse(await readFile(prevFile, 'utf8')) : { plugins: [] };
  const urls = changedUrls(previous, next, SITE);
  log(`${urls.length} URLs to submit (${urls.filter((u) => u.includes('/plugins/') && !u.endsWith('/plugins/')).length / 2} plugin pages per locale)`);

  if (DRY_RUN) {
    for (const u of urls.slice(0, 20)) log(`  ${u}`);
    return;
  }

  const key = await readKey();
  log(`waiting for ${SITE} to serve snapshot ${next.generatedAt}…`);
  if (!(await waitForDeploy(next.generatedAt))) log(`  not live after ${WAIT_MINUTES} min; submitting anyway`);

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload(SITE, key, urls)),
    signal: AbortSignal.timeout(60_000),
  });
  // 200 = accepted, 202 = accepted, key validation pending.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  log(`IndexNow accepted ${urls.length} URLs (${res.status})`);
}

main().catch((err) => {
  console.error('indexnow:', err?.message ?? err);
  process.exit(1);
});
