import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWav, fitWav, parseWav } from '../src/wav.js';

// A mono 16-bit clip whose samples all hold `value`.
function clip(frames, { sampleRate = 48000, value = 1000 } = {}) {
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i += 1) {
    data.writeInt16LE(value, i * 2);
  }
  return buildWav({ channels: 1, sampleRate, data });
}

test('parseWav reads back what buildWav wrote', () => {
  const wav = parseWav(clip(100));
  assert.equal(wav.channels, 1);
  assert.equal(wav.sampleRate, 48000);
  assert.equal(wav.data.length, 200);
});

test('parseWav returns null for anything but 16-bit PCM WAV', () => {
  assert.equal(
    parseWav(Buffer.from('OggS, not a wav file at all, but long enough to check')),
    null,
  );
  assert.equal(parseWav(Buffer.alloc(10)), null);
  const float = clip(100);
  float.writeUInt16LE(3, 20); // IEEE float
  assert.equal(parseWav(float), null);
});

test('parseWav skips the chunks before the samples', () => {
  const plain = clip(10);
  const list = Buffer.alloc(8 + 6);
  list.write('LIST', 0, 'latin1');
  list.writeUInt32LE(6, 4);
  const withList = Buffer.concat([plain.subarray(0, 36), list, plain.subarray(36)]);
  assert.equal(parseWav(withList).data.length, 20);
});

test('fitWav repairs the header of a streamed file', () => {
  const streamed = clip(100);
  streamed.writeUInt32LE(0xffffffff, 4);
  streamed.writeUInt32LE(0xffffffff, 40);
  const fixed = fitWav(streamed, 1024 * 1024);
  assert.equal(fixed.readUInt32LE(40), 200);
  assert.equal(fixed.readUInt32LE(4), 236);
  assert.equal(parseWav(fixed).sampleRate, 48000);
});

test('fitWav leaves a clip that fits at its sample rate', () => {
  const wav = clip(1000);
  assert.deepEqual(fitWav(wav, 1024 * 1024), wav);
});

test('fitWav lowers the sample rate until the clip fits', () => {
  const max = 10_000;
  const twice = fitWav(clip(8000), max); // 16 KB of samples
  assert.ok(twice.length <= max);
  assert.equal(parseWav(twice).sampleRate, 24000);
  assert.equal(parseWav(twice).data.readInt16LE(0), 1000);

  const thrice = fitWav(clip(14000), max); // 28 KB of samples
  assert.ok(thrice.length <= max);
  assert.equal(parseWav(thrice).sampleRate, 16000);
});

test('fitWav averages the frames it merges', () => {
  const data = Buffer.alloc(8);
  [100, 300, -50, 50].forEach((sample, i) => data.writeInt16LE(sample, i * 2));
  const out = parseWav(fitWav(buildWav({ channels: 1, sampleRate: 48000, data }), 44 + 4));
  assert.equal(out.data.readInt16LE(0), 200);
  assert.equal(out.data.readInt16LE(2), 0);
});

test('fitWav returns a file it does not understand untouched', () => {
  const ogg = Buffer.from('OggS'.padEnd(64, 'x'));
  assert.equal(fitWav(ogg, 10), ogg);
});
