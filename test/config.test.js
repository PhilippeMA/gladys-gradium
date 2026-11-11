import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, voiceFor } from '../src/config.js';

test('normalizeConfig returns the defaults for an empty config', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  assert.deepEqual(normalizeConfig(null), DEFAULT_CONFIG);
});

test('normalizeConfig trims the texts and keeps a default voice', () => {
  const config = normalizeConfig({ api_key: '  key  ', voice_default: '   ', voice_fr: ' abc ' });
  assert.equal(config.api_key, 'key');
  assert.equal(config.voice_default, DEFAULT_CONFIG.voice_default);
  assert.equal(config.voice_fr, 'abc');
});

test('normalizeConfig refuses unknown regions and formats', () => {
  const config = normalizeConfig({ region: 'mars', output_format: 'mp3' });
  assert.equal(config.region, 'default');
  assert.equal(config.output_format, 'wav');
  assert.equal(normalizeConfig({ region: 'eu', output_format: 'opus' }).region, 'eu');
});

test('normalizeConfig turns the pace into a bounded number', () => {
  assert.equal(normalizeConfig({ speed: '1.5' }).speed, 1.5);
  assert.equal(normalizeConfig({ speed: 12 }).speed, 4);
  assert.equal(normalizeConfig({ speed: -12 }).speed, -4);
  assert.equal(normalizeConfig({ speed: 'fast' }).speed, 0);
});

test('voiceFor picks the voice of the language, the default voice otherwise', () => {
  const config = normalizeConfig({ voice_default: 'default-voice', voice_fr: 'french-voice' });
  assert.equal(voiceFor(config, 'fr'), 'french-voice');
  assert.equal(voiceFor(config, 'fr-FR'), 'french-voice');
  assert.equal(voiceFor(config, 'FR'), 'french-voice');
  assert.equal(voiceFor(config, 'en'), 'default-voice');
  assert.equal(voiceFor(config, 'ja'), 'default-voice');
  assert.equal(voiceFor(config, null), 'default-voice');
});
