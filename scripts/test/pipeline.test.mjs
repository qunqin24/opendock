import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { create } from 'tar';

const run = promisify(execFile);

test('pipeline writes a complete snapshot even when download API is unavailable', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'opendock-pipeline-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(fileURLToPath(new URL('..', import.meta.url)), path.join(root, 'scripts'), { recursive: true });
  await symlink(fileURLToPath(new URL('../../node_modules', import.meta.url)), path.join(root, 'node_modules'), 'junction');
  await mkdir(path.join(root, 'src/data'), { recursive: true });
  await mkdir(path.join(root, 'data'));
  await mkdir(path.join(root, 'package'));
  await writeFile(path.join(root, 'package/gui-experimental.cjs'), 'module.exports = {};');
  await create({ cwd: root, file: path.join(root, 'file-editor.tgz'), gzip: true }, ['package/gui-experimental.cjs']);
  await writeFile(path.join(root, 'src/data/plugins.json'), JSON.stringify({
    plugins: [{ name: 'existing', downloadsMonth: 1234, downloadsWeek: 123 }],
  }));
  const mock = path.join(root, 'mock-network.mjs');
  await writeFile(mock, `
    import { readFile } from 'node:fs/promises';
    globalThis.fetch = async (url) => {
      if (url.endsWith('/file-editor.tgz')) {
        if (process.argv.includes('--archive-unavailable')) return new Response(null, { status: 503 });
        return new Response(await readFile(new URL('./file-editor.tgz', import.meta.url)));
      }
      if (url.includes('/-/v1/search')) return Response.json({ total: 3, objects:
        ['existing', 'opencode-file-editor', 'explicit-desktop'].map(name => ({ package: { name, description: 'A useful plugin' } }))
      });
      if (url.startsWith('https://registry.npmjs.org/')) {
        const fileEditor = url.endsWith('/opencode-file-editor');
        const version = fileEditor && process.argv.includes('--version-bumped') ? '0.5.3' : '0.5.2';
        const exports = url.endsWith('/explicit-desktop') ? { './gui-experimental': './dist/gui-experimental.cjs' } : {};
        return Response.json({
          'dist-tags': { latest: version }, time: { [version]: '2026-11-19T00:00:00.000Z' }, versions: { [version]: {
            description: 'A useful plugin',
            license: 'MIT',
            ...(fileEditor ? { dist: { tarball: 'https://registry.npmjs.org/opencode-file-editor/-/file-editor.tgz' } } : { exports }),
          } }
        });
      }
      if (url.startsWith('https://api.npmjs.org/')) return new Response('', { status: 404 });
      throw new Error('Unexpected network call: ' + url);
    };
  `);
  const args = ['--import', mock, path.join(root, 'scripts/fetch-plugins.mjs'), '--fresh'];
  const { stdout } = await run(process.execPath, args, { timeout: 5000 });
  const snapshot = JSON.parse(await readFile(path.join(root, 'src/data/plugins.json'), 'utf8'));
  assert.equal(snapshot.total, 3);
  assert.equal(snapshot.plugins.find(p => p.name === 'existing').downloadsMonth, 1234);
  assert.equal(snapshot.plugins.find(p => p.name === 'existing').downloadsWeek, 123);
  assert.equal(snapshot.plugins.find(p => p.name === 'opencode-file-editor').downloadsMonth, 0);
  assert.equal(snapshot.plugins.find(p => p.name === 'opencode-file-editor').opencode, 'v2');
  assert.equal(snapshot.plugins.find(p => p.name === 'opencode-file-editor').opencodeDesktop, true);
  assert.equal(snapshot.plugins.find(p => p.name === 'explicit-desktop').opencodeDesktop, true);
  assert.equal(Object.hasOwn(snapshot.plugins.find(p => p.name === 'existing'), 'opencodeDesktop'), false);
  assert.ok(Date.now() - Date.parse(snapshot.generatedAt) < 5000);
  assert.match(stdout, /1 last-known, 2 unavailable/);
  assert.match(stdout, /wrote 3 plugins/);

  await run(process.execPath, [...args, '--archive-unavailable'], { timeout: 5000 });
  const refreshed = JSON.parse(await readFile(path.join(root, 'src/data/plugins.json'), 'utf8'));
  assert.equal(refreshed.plugins.find(p => p.name === 'opencode-file-editor').opencodeDesktop, true);

  await run(process.execPath, [...args, '--archive-unavailable', '--version-bumped'], { timeout: 5000 });
  const bumped = JSON.parse(await readFile(path.join(root, 'src/data/plugins.json'), 'utf8'));
  assert.equal(bumped.plugins.find(p => p.name === 'opencode-file-editor').opencodeDesktop, undefined);
});
