import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { normalizeConfig } from '../src/config.js';
import { MAX_AUDIO_BYTES, synthesizeSpeech } from '../src/tts.js';
import { buildWav, parseWav } from '../src/wav.js';

const realFetch = globalThis.fetch;
const config = normalizeConfig({
  api_key: 'key',
  voice_default: 'default-voice',
  voice_fr: 'fr-voice',
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockAudio(bytes) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response(bytes, { status: 200 });
  };
  return calls;
}

const wavOf = (bytes) => buildWav({ channels: 1, sampleRate: 48000, data: Buffer.alloc(bytes) });
const decode = (audio) => Buffer.from(audio.split(';base64,')[1], 'base64');

test('Gladys receives a WAV clip, spoken with the voice of the language', async () => {
  const gladys = createFakeGladys();
  gladys.onTtsSynthesize((text, language) => synthesizeSpeech(config, text, language));
  const calls = mockAudio(wavOf(4800));

  const ack = await gladys.fake.ttsSynthesize('Bonjour à tous', 'fr');

  assert.equal(ack.success, true, JSON.stringify(ack));
  assert.match(ack.data.audio, /^audio\/wav;base64,/);
  assert.equal(calls[0].voice_id, 'fr-voice');
  assert.equal(calls[0].text, 'Bonjour à tous');
});

test('an unknown language speaks with the default voice', async () => {
  const calls = mockAudio(wavOf(4800));
  await synthesizeSpeech(config, 'Hello', null);
  assert.equal(calls[0].voice_id, 'default-voice');
});

test('the Opus format is served as audio/ogg, untouched', async () => {
  const ogg = Buffer.from('OggS-opus-payload');
  mockAudio(ogg);
  const audio = await synthesizeSpeech({ ...config, output_format: 'opus' }, 'Hello', 'en');
  assert.match(audio, /^audio\/ogg;base64,/);
  assert.deepEqual(decode(audio), ogg);
});

test('a WAV clip above 5 MB is resampled to fit', async () => {
  mockAudio(wavOf(8 * 1024 * 1024));
  const audio = decode(await synthesizeSpeech(config, 'A long text', 'en'));
  assert.ok(audio.length <= MAX_AUDIO_BYTES);
  assert.equal(parseWav(audio).sampleRate, 24000);
});

test('a clip that cannot fit is refused with a reason', async () => {
  mockAudio(Buffer.alloc(MAX_AUDIO_BYTES + 1));
  await assert.rejects(
    () => synthesizeSpeech({ ...config, output_format: 'opus' }, 'Hello', 'en'),
    /Gladys accepts 5 MB/,
  );
});

test('an empty text is refused without calling Gradium', async () => {
  const calls = mockAudio(wavOf(10));
  await assert.rejects(() => synthesizeSpeech(config, '   ', 'en'), /text is empty/);
  assert.equal(calls.length, 0);
});

test('a Gradium failure fails the synthesis asked by Gladys', async () => {
  const gladys = createFakeGladys();
  gladys.onTtsSynthesize((text, language) => synthesizeSpeech(config, text, language));
  globalThis.fetch = async () => new Response('nope', { status: 500 });

  const ack = await gladys.fake.ttsSynthesize('Hello', 'en');
  assert.equal(ack.success, false);
});
