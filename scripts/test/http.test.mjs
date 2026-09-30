import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { getJSON } from '../lib/http.mjs';

async function server(t, handler) {
  const s = createServer(handler);
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve));
  t.after(() => { s.closeAllConnections(); return new Promise((resolve) => s.close(resolve)); });
  return `http://127.0.0.1:${s.address().port}`;
}

test('retries 429/5xx and returns JSON', async (t) => {
  let calls = 0;
  const url = await server(t, (_, res) => {
    calls++;
    res.writeHead(calls < 3 ? (calls === 1 ? 429 : 503) : 200, { 'retry-after': '3600' });
    res.end('{"downloads":3}');
  });
  assert.deepEqual(await getJSON(url, { retries: 2, maxRetryDelayMs: 5 }), { downloads: 3 });
  assert.equal(calls, 3);
});

test('404 returns null; permanent client errors are not retried', async (t) => {
  let calls = 0;
  const url = await server(t, (req, res) => { calls++; res.writeHead(req.url === '/404' ? 404 : 401); res.end(); });
  assert.equal(await getJSON(`${url}/404`), null);
  await assert.rejects(getJSON(`${url}/401`), /401/);
  assert.equal(calls, 2);
});

test('timeout covers stalled response headers and stalled JSON body', async (t) => {
  const url = await server(t, (req, res) => {
    if (req.url === '/body') { res.writeHead(200); res.write('{'); }
  });
  for (const endpoint of ['/headers', '/body']) {
    const started = Date.now();
    await assert.rejects(getJSON(url + endpoint, { retries: 0, timeoutMs: 40 }), /timeout|abort/i);
    assert.ok(Date.now() - started < 1000);
  }
});

test('stage abort interrupts retry-after sleep', async (t) => {
  let calls = 0;
  const url = await server(t, (_, res) => { calls++; res.writeHead(429, { 'retry-after': '86400' }); res.end(); });
  const started = Date.now();
  await assert.rejects(getJSON(url, { signal: AbortSignal.timeout(60) }), /abort/i);
  assert.equal(calls, 1);
  assert.ok(Date.now() - started < 1000);
});

test('no backoff after the last permitted attempt', async (t) => {
  const url = await server(t, (_, res) => { res.writeHead(429, { 'retry-after': '86400' }); res.end(); });
  const started = Date.now();
  await assert.rejects(getJSON(url, { retries: 0 }), /429/);
  assert.ok(Date.now() - started < 1000);
});
