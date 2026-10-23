import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  BingTranslator,
  TranslatorStopped,
  TranslateError,
  extractCredentials,
  parseTranslation,
  API_URL,
  PAGE_URL,
} from '../lib/translate.mjs';
import {
  TranslationCache,
  cacheKey,
  classifyText,
  normalizeSource,
  translateDescriptions,
} from '../lib/descriptions.mjs';

// ------------------------------------------------------------------ fixtures

const PAGE_HTML = (n = 1) => `<!doctype html><html><head><script>
  var _G={IG:"ABCDEF0123456789${n}",Region:"CN"};
  var params_AbusePreventionHelper = [1700000000000${n},"tok-${n}-xyz",3600000];
</script></head><body>
  <div data-iid="translator.5022.1"></div>
  <div data-iid="translator.5023.${n}"></div>
</body></html>`;

const json = (body, init) => Response.json(body, init);
const ok = (text) => json([{ detectedLanguage: { language: 'en' }, translations: [{ text, to: 'zh-Hans' }] }]);

/** Fake Bing: `post(params, url, call#)` returns a Response; the page serves fresh credentials each time. */
function fakeBing({ page, post }) {
  const calls = { page: 0, post: 0, bodies: [] };
  const fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith(PAGE_URL)) {
      calls.page++;
      return page ? page(calls.page) : new Response(PAGE_HTML(calls.page), { headers: { 'content-type': 'text/html' } });
    }
    if (u.startsWith(API_URL)) {
      calls.post++;
      const params = Object.fromEntries(new URLSearchParams(String(init.body)));
      calls.bodies.push({ params, url: new URL(u) });
      return post(params, new URL(u), calls.post);
    }
    throw new Error(`unexpected URL ${u}`);
  };
  return { fetch, calls };
}

const translator = (fetch, extra = {}) =>
  new BingTranslator({ fetch, intervalMs: 0, sleep: async () => {}, ...extra });

// ------------------------------------------------------- credential extraction

test('extractCredentials reads IG, last data-iid, key and token from the page', () => {
  const c = extractCredentials(PAGE_HTML(7));
  assert.equal(c.ig, 'ABCDEF01234567897');
  assert.equal(c.iid, 'translator.5023.7');
  assert.equal(c.key, '17000000000007');
  assert.equal(c.token, 'tok-7-xyz');
  assert.equal(c.ttlMs, 3600000);
});

test('extractCredentials also accepts the JSON-style "ig" and returns null when anything is missing', () => {
  const html = `{"ig":"IGVALUE"} <p data-iid='a.b'></p> params_AbusePreventionHelper = [42,"t"]`;
  assert.deepEqual(extractCredentials(html), { ig: 'IGVALUE', iid: 'a.b', key: '42', token: 't', ttlMs: null });
  assert.equal(extractCredentials('<html>no params here</html>'), null);
  assert.equal(extractCredentials(PAGE_HTML().replace(/data-iid/g, 'data-x')), null);
});

test('translate sends the documented form (fromLang/to/text/key/token) with IG and IID in the query', async () => {
  const bing = fakeBing({ post: (p) => ok(`zh:${p.text}`) });
  const t = translator(bing.fetch);
  assert.equal(await t.translate('Hello world'), 'zh:Hello world');
  const { params, url } = bing.calls.bodies[0];
  assert.deepEqual(params, {
    fromLang: 'auto-detect',
    to: 'zh-Hans',
    text: 'Hello world',
    key: '17000000000001',
    token: 'tok-1-xyz',
  });
  assert.equal(url.searchParams.get('IG'), 'ABCDEF01234567891');
  assert.equal(url.searchParams.get('IID'), 'translator.5023.1');
});

// ------------------------------------------------ credential sharing / refresh

test('concurrent calls share one in-flight credential fetch and reuse the result', async () => {
  const bing = fakeBing({ post: (p) => ok(`zh:${p.text}`) });
  const t = translator(bing.fetch);
  const out = await Promise.all(['a', 'b', 'c', 'd'].map((s) => t.translate(s)));
  assert.deepEqual(out, ['zh:a', 'zh:b', 'zh:c', 'zh:d']);
  assert.equal(bing.calls.page, 1);
  assert.equal(bing.calls.post, 4);
});

test('never exceeds two requests in flight', async () => {
  let active = 0;
  let peak = 0;
  const bing = fakeBing({
    post: async (p) => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return ok(`zh:${p.text}`);
    },
  });
  const t = translator(bing.fetch, { concurrency: 10 });
  await Promise.all(Array.from({ length: 8 }, (_, i) => t.translate(`s${i}`)));
  assert.equal(peak, 2);
});

test('a failed request refreshes credentials once and retries once', async () => {
  const bing = fakeBing({ post: (p, _u, n) => (n === 1 ? json({ statusCode: 400 }) : ok(`zh:${p.text}`)) });
  const t = translator(bing.fetch);
  assert.equal(await t.translate('hi there'), 'zh:hi there');
  assert.equal(bing.calls.page, 2); // initial + one refresh
  assert.equal(bing.calls.post, 2);
  assert.equal(bing.calls.bodies[1].params.token, 'tok-2-xyz'); // retry used the new credentials
});

test('refresh is bounded: persistent failure makes exactly two attempts, then throws', async () => {
  const bing = fakeBing({ post: () => json({ statusCode: 400 }) });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('hi there'), TranslateError);
  assert.equal(bing.calls.post, 2);
  assert.equal(bing.calls.page, 2);
  assert.equal(t.stopped, false); // one bad text is not a reason to stop
});

// ------------------------------------------------------ 200 responses with errors

test('HTTP 200 error payloads are detected and never returned as translations', () => {
  assert.throws(() => parseTranslation({ statusCode: 400 }), /error payload \(400\)/);
  assert.throws(() => parseTranslation({ errorMessage: 'nope' }), TranslateError);
  assert.throws(() => parseTranslation([]), /unexpected/);
  assert.throws(() => parseTranslation([{ translations: [{ text: '  ' }] }]), /unexpected/);
  assert.throws(() => parseTranslation([{ translations: [] }]), /unexpected/);
  assert.deepEqual(parseTranslation([{ translations: [{ text: '你好' }] }]), { text: '你好' });
  assert.match(parseTranslation({ ShowCaptcha: true }).stop, /captcha/i);
  assert.match(parseTranslation({ statusCode: 429 }).stop, /429/);
});

test('a 200 response carrying a captcha flag opens the breaker', async () => {
  const bing = fakeBing({ post: () => json({ ShowCaptcha: true, statusCode: 200 }) });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('one'), TranslatorStopped);
  assert.match(t.stopReason, /captcha/i);
});

// ---------------------------------------------------------------- circuit breaker

test('HTTP 429 on the API opens the breaker: no retry, no later network calls', async () => {
  const bing = fakeBing({ post: () => new Response('slow down', { status: 429 }) });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('one'), TranslatorStopped);
  assert.equal(bing.calls.post, 1); // not retried
  assert.equal(t.stopped, true);
  const before = { ...bing.calls };
  await assert.rejects(t.translate('two'), TranslatorStopped);
  await assert.rejects(t.translate('three'), TranslatorStopped);
  assert.deepEqual(bing.calls, before);
});

test('HTTP 403 on the translator page opens the breaker', async () => {
  const bing = fakeBing({ page: () => new Response('denied', { status: 403 }), post: () => ok('x') });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('one'), TranslatorStopped);
  assert.equal(bing.calls.post, 0);
  assert.equal(bing.calls.page, 1);
});

test('an HTML challenge page (even with status 200) opens the breaker', async () => {
  const challenge = '<html><body>Please verify you are human</body></html>';
  const onApi = fakeBing({ post: () => new Response(challenge, { headers: { 'content-type': 'text/html' } }) });
  const t1 = translator(onApi.fetch);
  await assert.rejects(t1.translate('one'), TranslatorStopped);
  assert.match(t1.stopReason, /challenge/i);
  assert.equal(onApi.calls.post, 1);

  const onPage = fakeBing({ page: () => new Response(challenge, { headers: { 'content-type': 'text/html' } }), post: () => ok('x') });
  const t2 = translator(onPage.fetch);
  await assert.rejects(t2.translate('one'), TranslatorStopped);
  assert.equal(onPage.calls.post, 0);
});

test('a page that cannot be parsed stops translating instead of retrying forever', async () => {
  const bing = fakeBing({ page: () => new Response('<html>redesign</html>'), post: () => ok('x') });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('one'), TranslatorStopped);
  await assert.rejects(t.translate('two'), TranslatorStopped);
  assert.equal(bing.calls.page, 1);
});

test('repeated per-text failures eventually open the breaker', async () => {
  const bing = fakeBing({ post: () => json({ statusCode: 400 }) });
  const t = translator(bing.fetch, { maxConsecutiveFailures: 3 });
  for (let i = 0; i < 3; i++) await assert.rejects(t.translate(`t${i}`), (e) => e instanceof TranslateError || e instanceof TranslatorStopped);
  assert.equal(t.stopped, true);
  const posts = bing.calls.post;
  await assert.rejects(t.translate('later'), TranslatorStopped);
  assert.equal(bing.calls.post, posts);
});

test('timeouts surface as failures, not hangs', async () => {
  const bing = fakeBing({ post: (_p, _u) => new Promise(() => {}) });
  // fetch ignores the signal here, so wrap it the way real fetch behaves.
  const fetch = (url, init) =>
    Promise.race([
      bing.fetch(url, init),
      new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason))),
    ]);
  const t = translator(fetch, { timeoutMs: 30 });
  await assert.rejects(t.translate('slow'), /timeout/);
});

test('empty and over-long input is rejected without touching the network', async () => {
  const bing = fakeBing({ post: () => ok('x') });
  const t = translator(bing.fetch);
  await assert.rejects(t.translate('   '), TranslateError);
  await assert.rejects(t.translate('x'.repeat(1001)), /1000/);
  assert.equal(bing.calls.page + bing.calls.post, 0);
});

// ------------------------------------------------------------------- skip rules

test('classifyText skips empty, over-long, already-Chinese and non-prose text', () => {
  const reason = (s) => classifyText(s).reason;
  assert.equal(reason(null), 'empty');
  assert.equal(reason('   \n '), 'empty');
  assert.equal(reason('x '.repeat(600)), 'too-long');
  assert.equal(reason('一个用于同步会话的 OpenCode 插件'), 'chinese');
  assert.equal(reason('用于 OpenCode 的插件'), 'chinese');
  assert.equal(reason('https://github.com/foo/bar'), 'not-prose');
  assert.equal(reason('  www.example.com/docs  '), 'not-prose');
  assert.equal(reason('1.2.3 — 2024 🚀'), 'not-prose');
  assert.equal(reason('@scope/opencode-foo'), 'not-prose');
  assert.equal(reason('opencode-foo_bar'), 'not-prose');
});

test('classifyText accepts ordinary prose and normalises whitespace', () => {
  assert.deepEqual(classifyText('  Sync your\n sessions   to Notion. '), { ok: true, text: 'Sync your sessions to Notion.' });
  assert.equal(classifyText('Autocomplete').ok, true);
  assert.equal(classifyText('See https://x.dev for docs on the OpenCode auth plugin').ok, true);
  assert.equal(classifyText('OpenCode plugin 的 auth helper for Claude').ok, true); // mostly English with a stray CJK word
});

// ------------------------------------------------------------- cache hit / miss

async function tmpCache(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'opendock-trans-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'translations.json');
  return { file, cache: await new TranslationCache(file).load() };
}

const fakeTranslator = (fn) => {
  const t = { calls: [], stopped: false, stopReason: null, async translate(text) { t.calls.push(text); return fn(text, t); } };
  return t;
};

test('cacheKey ignores whitespace noise but depends on provider and target', () => {
  assert.equal(cacheKey('Hello  world\n'), cacheKey(' Hello world'));
  assert.notEqual(cacheKey('Hello world'), cacheKey('Hello world', { target: 'ja' }));
  assert.notEqual(cacheKey('Hello world'), cacheKey('Hello world', { provider: 'other' }));
  assert.equal(normalizeSource(' a \t b\n'), 'a b');
});

test('cache miss translates and stores; cache hit does not call the translator', async (t) => {
  const { file, cache } = await tmpCache(t);
  const plugins = [
    { name: 'a', description: 'Sync sessions to Notion.' },
    { name: 'b', description: 'Sync  sessions to   Notion.' }, // same after normalisation: one request
    { name: 'c', description: 'Lint on save.' },
    { name: 'd', description: null },
    { name: 'e', description: 'https://example.com' },
    { name: 'f', description: '把会话同步到 Notion 的插件' },
  ];
  const tr = fakeTranslator((s) => `ZH(${s})`);
  const first = await translateDescriptions(plugins, { translator: tr, cache });
  assert.deepEqual(tr.calls.sort(), ['Lint on save.', 'Sync sessions to Notion.']);
  assert.equal(first.result.get('a'), 'ZH(Sync sessions to Notion.)');
  assert.equal(first.result.get('b'), 'ZH(Sync sessions to Notion.)');
  assert.equal(first.result.get('d'), null);
  assert.equal(first.result.get('e'), null);
  assert.equal(first.result.get('f'), null);
  assert.equal(first.stats.translated, 3);
  assert.deepEqual(first.stats.skipped, { empty: 1, 'too-long': 0, chinese: 1, 'not-prose': 1 });

  // Persisted, sorted, and reloadable.
  const onDisk = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(Object.keys(onDisk).length, 2);
  assert.deepEqual(Object.keys(onDisk), Object.keys(onDisk).slice().sort());

  // Second run with a fresh cache object: everything is a hit, no requests at all.
  const reloaded = await new TranslationCache(file).load();
  const tr2 = fakeTranslator(() => { throw new Error('must not be called'); });
  const second = await translateDescriptions(plugins, { translator: tr2, cache: reloaded });
  assert.equal(tr2.calls.length, 0);
  assert.equal(second.stats.cached, 3);
  assert.equal(second.result.get('c'), 'ZH(Lint on save.)');

  // A changed description is a miss; the unchanged ones stay hits.
  const tr3 = fakeTranslator((s) => `ZH(${s})`);
  await translateDescriptions([...plugins.slice(0, 2), { name: 'c', description: 'Lint on save, fast.' }], { translator: tr3, cache: reloaded });
  assert.deepEqual(tr3.calls, ['Lint on save, fast.']);
});

test('failures are not cached and stay null; the next run retries them', async (t) => {
  const { file, cache } = await tmpCache(t);
  const plugins = [{ name: 'a', description: 'Works fine.' }, { name: 'b', description: 'Always breaks.' }];
  const tr = fakeTranslator((s) => {
    if (s.includes('breaks')) throw new TranslateError('boom');
    return `ZH(${s})`;
  });
  const run1 = await translateDescriptions(plugins, { translator: tr, cache });
  assert.equal(run1.result.get('a'), 'ZH(Works fine.)');
  assert.equal(run1.result.get('b'), null);
  assert.equal(run1.stats.failed, 1);
  assert.equal(Object.keys(JSON.parse(await readFile(file, 'utf8'))).length, 1);

  const tr2 = fakeTranslator((s) => `ZH(${s})`);
  const run2 = await translateDescriptions(plugins, { translator: tr2, cache });
  assert.deepEqual(tr2.calls, ['Always breaks.']);
  assert.equal(run2.result.get('b'), 'ZH(Always breaks.)');
});

test('empty translations are never cached', async (t) => {
  const { cache } = await tmpCache(t);
  cache.set('k', '');
  cache.set('k2', '   ');
  assert.equal(cache.size, 0);
});

test('a translator that returns the source verbatim yields null (nothing to show)', async (t) => {
  const { cache } = await tmpCache(t);
  const tr = fakeTranslator((s) => s);
  const r = await translateDescriptions([{ name: 'a', description: 'Neovim' }], { translator: tr, cache });
  assert.equal(r.result.get('a'), null);
  assert.equal(r.stats.unchanged, 1);
  // ...and it is cached, so it is not requested again.
  const tr2 = fakeTranslator(() => { throw new Error('no'); });
  await translateDescriptions([{ name: 'a', description: 'Neovim' }], { translator: tr2, cache });
  assert.equal(tr2.calls.length, 0);
});

test('maxNew caps new requests (best-ranked first) and counts the rest as deferred', async (t) => {
  const { cache } = await tmpCache(t);
  const plugins = ['one', 'two', 'three', 'four'].map((w) => ({ name: w, description: `The ${w} plugin.` }));
  const tr = fakeTranslator((s) => `ZH(${s})`);
  const r = await translateDescriptions(plugins, { translator: tr, cache, maxNew: 2, concurrency: 1 });
  assert.deepEqual(tr.calls, ['The one plugin.', 'The two plugin.']);
  assert.equal(r.stats.translated, 2);
  assert.equal(r.stats.deferred, 2);
  assert.equal(r.result.get('three'), null);
});

test('cache-only mode (translator null) applies cached values and never requests', async (t) => {
  const { cache } = await tmpCache(t);
  cache.set(cacheKey('Cached one.'), '缓存的一条。');
  const r = await translateDescriptions(
    [{ name: 'a', description: 'Cached one.' }, { name: 'b', description: 'Not cached.' }],
    { translator: null, cache },
  );
  assert.equal(r.result.get('a'), '缓存的一条。');
  assert.equal(r.result.get('b'), null);
  assert.equal(r.stats.deferred, 1);
});

test('breaker tripping mid-run keeps earlier results and stops asking', async (t) => {
  const { file, cache } = await tmpCache(t);
  const plugins = ['one', 'two', 'three', 'four', 'five'].map((w) => ({ name: w, description: `The ${w} plugin.` }));
  let n = 0;
  const tr = fakeTranslator((s, self) => {
    if (++n === 3) {
      self.stopped = true;
      self.stopReason = 'Bing answered HTTP 429';
      throw new TranslatorStopped(self.stopReason);
    }
    return `ZH(${s})`;
  });
  const r = await translateDescriptions(plugins, { translator: tr, cache, concurrency: 1 });
  assert.equal(tr.calls.length, 3);
  assert.equal(r.stats.translated, 2);
  assert.equal(r.stats.failed, 0);
  assert.equal(r.stats.deferred, 3);
  assert.match(r.stats.stopReason, /429/);
  assert.equal(Object.keys(JSON.parse(await readFile(file, 'utf8'))).length, 2);
});
