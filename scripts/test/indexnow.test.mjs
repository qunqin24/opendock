import test from 'node:test';
import assert from 'node:assert/strict';

import { changedUrls, payload } from '../lib/indexnow.mjs';

const plugin = (slug, extra = {}) => ({ slug, title: slug, version: '1.0.0', description: 'x', stars: 1, ...extra });

test('changedUrls submits listings plus added, removed and edited plugins in both locales', () => {
  const previous = { plugins: [plugin('same'), plugin('bumped'), plugin('gone'), plugin('starred')] };
  const next = {
    categories: [{ id: 'tools' }],
    plugins: [plugin('same'), plugin('bumped', { version: '1.1.0' }), plugin('new'), plugin('starred', { stars: 900 })],
  };
  const urls = changedUrls(previous, next, 'https://example.com/');
  const plugins = urls.filter((u) => /\/plugins\/[^/]+\/$/.test(u));

  assert.ok(urls.includes('https://example.com/'));
  assert.ok(urls.includes('https://example.com/zh/categories/tools/'));
  assert.deepEqual(
    plugins.filter((u) => !u.includes('/zh/')).sort(),
    ['https://example.com/plugins/bumped/', 'https://example.com/plugins/gone/', 'https://example.com/plugins/new/'],
  );
  assert.equal(plugins.filter((u) => u.includes('/zh/')).length, 3);
});

test('payload points keyLocation at the key file on the site root', () => {
  assert.deepEqual(payload('https://www.example.com', 'abc', ['https://www.example.com/']), {
    host: 'www.example.com',
    key: 'abc',
    keyLocation: 'https://www.example.com/abc.txt',
    urlList: ['https://www.example.com/'],
  });
});
