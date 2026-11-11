import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { ACTIONS, checkConnection } from '../src/actions.js';

const realFetch = globalThis.fetch;
const config = normalizeConfig({ api_key: 'key' });

afterEach(() => {
  globalThis.fetch = realFetch;
});

const answer = (body, status = 200) => {
  globalThis.fetch = async () => Response.json(body, { status });
};

test('without API key, nothing is connected and the user is told what to do', async () => {
  const { connected, message } = await checkConnection(normalizeConfig());
  assert.equal(connected, false);
  assert.match(message.en, /API key/);
  assert.match(message.fr, /clé d’API/);
  assert.deepEqual(await ACTIONS.list_voices(normalizeConfig()), message);
});

test('the connection test shows the remaining credits', async () => {
  answer({ remaining: 4200, allocated: 45000 });
  const { connected, message } = await checkConnection(config);
  assert.equal(connected, true);
  assert.match(message.en, /Remaining credits: 4,200 \/ 45,000/);
  assert.match(message.fr, /Crédits restants/);
  assert.deepEqual(await ACTIONS.test_connection(config), message);
});

test('a refused API key is explained', async () => {
  answer({ detail: 'Invalid API key' }, 401);
  const { connected, message } = await checkConnection(config);
  assert.equal(connected, false);
  assert.match(message.en, /refused the API key/);
});

test('any other failure reports Gradium as unreachable', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const { connected, message } = await checkConnection(config);
  assert.equal(connected, false);
  assert.match(message.en, /unreachable \(Gradium request failed: fetch failed\)/);
});

test('the voice list shows names, languages and identifiers, sorted', async () => {
  answer([
    { uid: 'id-emma', name: 'Emma', language: 'en' },
    { uid: 'id-elise', name: 'Elise', language: 'fr' },
    { uid: 'id-adam', name: 'Adam', language: 'en' },
  ]);
  const message = await ACTIONS.list_voices(config);
  assert.equal(
    message.en,
    '3 voices. Adam (en): id-adam — Emma (en): id-emma — Elise (fr): id-elise',
  );
  assert.match(message.fr, /^3 voix\. /);
});

test('the voice list is cut when the account has many voices', async () => {
  answer(Array.from({ length: 80 }, (_, i) => ({ uid: `id-${i}`, name: `Voice ${i}` })));
  const message = await ACTIONS.list_voices(config);
  assert.match(message.en, /^80 voices\. .* — and 20 more in Gradium Studio\.$/);
});

test('an account without voice says so', async () => {
  answer([]);
  assert.match((await ACTIONS.list_voices(config)).en, /No voice found/);
});
