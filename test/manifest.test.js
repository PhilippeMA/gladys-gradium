// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACTIONS } from '../src/actions.js';
import { DEFAULT_CONFIG, SPEED_MAX, SPEED_MIN, VOICE_LANGUAGES } from '../src/config.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const fields = manifest.config_schema.filter((field) => field.type !== 'section');
const sections = manifest.config_schema.filter((field) => field.type === 'section');
const keysOf = (list) => (list ?? []).map((entry) => entry.key);

test('the integration is a text-to-speech provider for Gladys >= 5.3.0', () => {
  // Older cores reject `type: "tts"` as unknown: the store validator refuses
  // a manifest claiming compatibility below the first release accepting it.
  assert.equal(manifest.type, 'tts');
  assert.deepEqual(manifest.categories, ['assistants']);
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  const [major, minor] = match.slice(1).map(Number);
  assert.ok(major > 5 || (major === 5 && minor >= 3), `got "${manifest.gladys_version}"`);
});

test('every manifest action has a handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions).sort(), Object.keys(ACTIONS).sort());
});

test('the config fields and DEFAULT_CONFIG hold the same keys', () => {
  assert.deepEqual(keysOf(fields).sort(), Object.keys(DEFAULT_CONFIG).sort());
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of fields) {
    if (field.default !== undefined) {
      assert.equal(
        DEFAULT_CONFIG[field.key],
        field.default,
        `DEFAULT_CONFIG.${field.key} must match the manifest default`,
      );
    }
  }
});

test('every supported language has its voice field', () => {
  for (const language of VOICE_LANGUAGES) {
    assert.ok(keysOf(fields).includes(`voice_${language}`), `voice_${language} is missing`);
  }
});

test('the pace bounds are the ones the code applies', () => {
  const speed = fields.find((field) => field.key === 'speed');
  assert.equal(speed.min, SPEED_MIN);
  assert.equal(speed.max, SPEED_MAX);
});

test('the API key is a secret without default', () => {
  const apiKey = fields.find((field) => field.key === 'api_key');
  assert.equal(apiKey.type, 'secret');
  assert.equal(apiKey.default, undefined);
});

test('section fields are purely presentational', () => {
  for (const section of sections) {
    // A section stores NO value: declaring `required`, `default` or
    // `placeholder` on it rejects the manifest.
    assert.equal(section.required, undefined, `section "${section.key}" must not be required`);
    assert.equal(section.default, undefined, `section "${section.key}" must not have a default`);
    assert.equal(section.placeholder, undefined, `section "${section.key}": placeholder`);
    assert.ok(section.label?.en, `section "${section.key}" needs an English label`);
    for (const text of Object.values(section.description ?? {})) {
      assert.ok(text.length <= 1000, `section "${section.key}": description too long`);
    }
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//, 'section links must be https');
    }
  }
});

test('every text is a multi-language object with English and French', () => {
  // A plain string rejects the manifest.
  const texts = [
    manifest.description,
    ...[...manifest.config_schema, ...manifest.actions].flatMap((entry) => [
      entry.label,
      entry.description,
      entry.placeholder,
      ...(entry.options ?? []).map((option) => option.label),
      ...(entry.links ?? []).map((link) => link.label),
    ]),
  ].filter((text) => text !== undefined);
  for (const text of texts) {
    assert.equal(typeof text, 'object');
    assert.ok(text.en && text.fr, `missing a language in ${JSON.stringify(text)}`);
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  // The Release workflow writes all three: a mismatch means one was edited by
  // hand, and Gladys would offer a version whose image is another one.
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.ok(
    manifest.docker_image.endsWith(`:${manifest.version}`),
    `docker_image must be tagged :${manifest.version}, got "${manifest.docker_image}"`,
  );
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(
      text.length >= 10 && text.length <= 100,
      `description.${lang} has ${text.length} characters (10 to 100 allowed)`,
    );
  }
});

test('the user documentation exists in both languages', async () => {
  // The store requires docs/en.md and docs/fr.md, 300 characters at least.
  for (const lang of ['en', 'fr']) {
    const doc = await readFile(new URL(`../docs/${lang}.md`, import.meta.url), 'utf8');
    assert.ok(doc.length >= 300, `docs/${lang}.md is too short`);
  }
});
