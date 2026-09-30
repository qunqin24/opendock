import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

test('pipeline writes a complete snapshot even when download API is unavailable', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'opendock-pipeline-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('..', import.meta.url)), path.join(root, 'scripts'), { recursive: true });
  await mkdir(path.join(root, 'src/data'), { recursive: true });
  await mkdir(path.join(root, 'data'));
  await writeFile(path.join(root, 'src/data/plugins.json'), JSON.stringify({
    plugins: [{ name: 'existing', downloadsMonth: 1234, downloadsWeek: 123 }],
  }));
  const mock = path.join(root, 'mock-network.mjs');
  await writeFile(mock, `
    globalThis.fetch = async (url) => {
      if (url.includes('/-/v1/search')) return Response.json({ total: 2, objects:
        ['existing', 'new-package'].map(name => ({ package: { name, description: 'A useful plugin' } }))
      });
      if (url.startsWith('https://registry.npmjs.org/')) return Response.json({
        'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': { description: 'A useful plugin', license: 'MIT' } }
      });
      if (url.startsWith('https://api.npmjs.org/')) return new Response('', { status: 404 });
      throw new Error('Unexpected network call: ' + url);
    };
  `);
  const { stdout } = await run(process.execPath, ['--import', mock, path.join(root, 'scripts/fetch-plugins.mjs'), '--fresh'], { timeout: 5000 });
  const snapshot = JSON.parse(await readFile(path.join(root, 'src/data/plugins.json'), 'utf8'));
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.plugins.find(p => p.name === 'existing').downloadsMonth, 1234);
  assert.equal(snapshot.plugins.find(p => p.name === 'existing').downloadsWeek, 123);
  assert.equal(snapshot.plugins.find(p => p.name === 'new-package').downloadsMonth, 0);
  assert.ok(Date.now() - Date.parse(snapshot.generatedAt) < 5000);
  assert.match(stdout, /1 last-known, 1 unavailable/);
  assert.match(stdout, /wrote 2 plugins/);
});
