import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { create } from 'tar';
import { desktopArchive, hasRootGuiBundle } from '../lib/desktop.mjs';

const url = 'https://registry.npmjs.org/opencode-file-editor/-/opencode-file-editor-0.5.2.tgz';

test('only probes registry archives for packages without an exports map', () => {
  const manifest = { dist: { tarball: url } };
  assert.equal(desktopArchive(manifest, '2026-11-19'), url);
  assert.equal(desktopArchive({ ...manifest, exports: {} }, '2026-11-19'), null);
  assert.equal(desktopArchive(manifest, '2026-08-01'), null);
  assert.equal(desktopArchive({ dist: { tarball: 'https://example.com/a.tgz' } }, '2026-11-19'), null);
  assert.equal(desktopArchive(null, '2026-11-19'), null);
});

async function tarResponse(t, entry) {
  const dir = await mkdtemp(path.join(tmpdir(), 'opendock-gui-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, entry);
  await mkdir(path.dirname(source), { recursive: true });
  await writeFile(source, 'module.exports = {};');
  const chunks = [];
  for await (const chunk of create({ cwd: dir, gzip: true }, [entry])) chunks.push(chunk);
  const archive = Buffer.concat(chunks);
  return async () => new Response(archive);
}

test('recognizes published root-level .cjs and .js files but not nested or TUI files', async (t) => {
  for (const [entry, expected] of [
    ['package/gui-experimental.cjs', true],
    ['package/gui-experimental.js', true],
    ['package/dist/gui-experimental.cjs', false],
    ['package/tui.js', false],
  ]) {
    const request = await tarResponse(t, entry);
    assert.equal(await hasRootGuiBundle(url, { request }), expected, entry);
  }
});

test('invalid, oversized, or unavailable archives are not negative evidence', async (t) => {
  const request = await tarResponse(t, 'package/gui-experimental.cjs');
  assert.equal(await hasRootGuiBundle(url, { request, compressedLimit: 5 }), null);
  assert.equal(await hasRootGuiBundle(url, { request, expandedLimit: 512 }), null);
  assert.equal(await hasRootGuiBundle(url, { request: async () => new Response('not an archive') }), null);
  assert.equal(await hasRootGuiBundle(url, { request: async () => new Response(null, { status: 503 }) }), null);
  assert.equal(await hasRootGuiBundle(url, { request, budget: AbortSignal.abort() }), null);
});
