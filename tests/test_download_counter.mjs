import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../functions/downloads/[file].js', import.meta.url), 'utf8');
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const url = 'https://p2r.gushon.com/downloads/Pack%202%20Rack.amxd';

function fixture({ method = 'GET', status = 200, headers = {}, requestUrl = url, failure } = {}) {
  const writes = [];
  const background = [];
  const response = new Response('device bytes', { status });
  const context = {
    request: new Request(requestUrl, { method, headers }),
    next: async () => response,
    waitUntil: (promise) => background.push(promise),
    env: {
      DOWNLOADS: {
        prepare: (sql) => {
          if (failure === 'prepare') throw new Error('database unavailable');
          return { bind: (...values) => ({ run: async () => {
            if (failure === 'run') throw new Error('database unavailable');
            writes.push({ sql, values });
          } }) };
        },
      },
    },
  };
  return { context, response, writes, background };
}

test('records one successful production request, returning the original file', async () => {
  const f = fixture();
  const response = await onRequest(f.context);
  assert.equal(response.status, f.response.status);
  assert.equal(await response.text(), 'device bytes');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  await Promise.all(f.background);
  assert.equal(f.writes.length, 1);
  assert.match(f.writes[0].sql, /ON CONFLICT/);
  assert.match(f.writes[0].values[0], /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(f.writes[0].values[1], 'Pack 2 Rack.amxd');
});

for (const [name, options] of [
  ['HEAD', { method: 'HEAD' }],
  ['missing file', { status: 404 }],
  ['partial response', { status: 206 }],
  ['range retry', { headers: { Range: 'bytes=0-99' } }],
  ['preview deployment', { requestUrl: url.replace('p2r.gushon.com', 'preview.pack-to-rack.pages.dev') }],
  ['another file', { requestUrl: url.replace('Pack%202%20Rack.amxd', 'other.amxd') }],
]) {
  test(`does not count ${name}`, async () => {
    const f = fixture(options);
    const response = await onRequest(f.context);
    assert.equal(response.status, f.response.status);
    assert.equal(await response.text(), 'device bytes');
    assert.equal(f.background.length, 0);
    assert.equal(f.writes.length, 0);
  });
}

for (const failure of ['prepare', 'run']) {
  test(`a database ${failure} failure does not break the download`, async () => {
    const f = fixture({ failure });
    const response = await onRequest(f.context);
    assert.equal(response.status, f.response.status);
    assert.equal(await response.text(), 'device bytes');
    await assert.doesNotReject(Promise.all(f.background));
    assert.equal(f.writes.length, 0);
  });
}
