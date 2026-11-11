import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { GradiumError, extractVoices, getCredits, listVoices, synthesize } from '../src/gradium.js';

const realFetch = globalThis.fetch;
const config = normalizeConfig({ api_key: 'secret-key' });

afterEach(() => {
  globalThis.fetch = realFetch;
});

// Replace fetch by a recorder answering `response`.
function mockFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return typeof response === 'function' ? response() : response;
  };
  return calls;
}

const audioResponse = (bytes) => new Response(bytes, { status: 200 });

test('synthesize posts the text and the voice with the API key', async () => {
  const calls = mockFetch(audioResponse(Buffer.from([1, 2, 3])));

  const audio = await synthesize(config, { text: 'Bonjour', voiceId: 'v1', outputFormat: 'wav' });

  assert.deepEqual([...audio], [1, 2, 3]);
  assert.equal(calls[0].url, 'https://api.gradium.ai/api/post/speech/tts');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['x-api-key'], 'secret-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    text: 'Bonjour',
    voice_id: 'v1',
    output_format: 'wav',
    only_audio: true,
  });
});

test('synthesize uses the host of the chosen region', async () => {
  const calls = mockFetch(() => audioResponse(Buffer.from([1])));
  await synthesize({ ...config, region: 'eu' }, { text: 'a', voiceId: 'v', outputFormat: 'wav' });
  await synthesize({ ...config, region: 'us' }, { text: 'a', voiceId: 'v', outputFormat: 'wav' });
  assert.match(calls[0].url, /^https:\/\/eu\.api\.gradium\.ai\/api\//);
  assert.match(calls[1].url, /^https:\/\/us\.api\.gradium\.ai\/api\//);
});

test('synthesize sends the pace only when it is not the natural one', async () => {
  const calls = mockFetch(() => audioResponse(Buffer.from([1])));
  await synthesize({ ...config, speed: -2 }, { text: 'a', voiceId: 'v', outputFormat: 'opus' });
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(JSON.parse(body.json_config), { padding_bonus: -2 });
  assert.equal(body.output_format, 'opus');
});

test('a call without API key fails before reaching the network', async () => {
  const calls = mockFetch(audioResponse(Buffer.from([1])));
  await assert.rejects(
    () => synthesize(normalizeConfig(), { text: 'a', voiceId: 'v', outputFormat: 'wav' }),
    (err) => err instanceof GradiumError && err.status === 401,
  );
  assert.equal(calls.length, 0);
});

test('an HTTP error carries the status and the reason given by Gradium', async () => {
  mockFetch(
    new Response(JSON.stringify({ detail: 'Invalid API key' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  );
  await assert.rejects(
    () => getCredits(config),
    (err) => err.status === 401 && /Gradium HTTP 401: Invalid API key/.test(err.message),
  );
});

test('an error never leaks the API key', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(
    () => getCredits(config),
    (err) => /fetch failed/.test(err.message) && !err.message.includes('secret-key'),
  );
});

test('an empty clip is an error', async () => {
  mockFetch(audioResponse(Buffer.alloc(0)));
  await assert.rejects(
    () => synthesize(config, { text: 'a', voiceId: 'v', outputFormat: 'wav' }),
    /empty audio clip/,
  );
});

test('getCredits reads the balance', async () => {
  const calls = mockFetch(Response.json({ remaining: 4200, allocated: 45000 }));
  assert.deepEqual(await getCredits(config), { remaining: 4200, allocated: 45000 });
  assert.equal(calls[0].url, 'https://api.gradium.ai/api/usages/credits');

  mockFetch(Response.json({ remaining_credits: 7 }));
  assert.deepEqual(await getCredits(config), { remaining: 7, allocated: null });
});

test('listVoices asks for the catalog too', async () => {
  const calls = mockFetch(Response.json([{ uid: 'a', name: 'Emma', language: 'en' }]));
  assert.deepEqual(await listVoices(config), [{ uid: 'a', name: 'Emma', language: 'en' }]);
  assert.match(calls[0].url, /\/api\/voices\/\?limit=0&include_catalog=1$/);
});

test('extractVoices collects the voices of every list, once each', () => {
  const voices = extractVoices({
    voices: [{ uid: 'a', name: 'Mine', language: 'fr' }],
    catalog: [{ uid: 'b', name: 'Emma', language: 'en' }, { uid: 'a', name: 'Mine' }, { uid: 'c' }],
    total: 3,
  });
  assert.deepEqual(voices, [
    { uid: 'a', name: 'Mine', language: 'fr' },
    { uid: 'b', name: 'Emma', language: 'en' },
    { uid: 'c', name: 'c', language: null },
  ]);
  assert.deepEqual(extractVoices(null), []);
});
