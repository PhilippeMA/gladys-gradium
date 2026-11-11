// -----------------------------------------------------------------------------
// WAV helpers.
//
// Gradium answers 48 kHz, 16-bit mono PCM: about 96 KB per second, when Gladys
// accepts a clip of 5 MB at most (roughly 52 s). A long text would be refused.
// `fitWav` lowers the sample rate by an integer factor (48 -> 24 -> 16 -> 12
// kHz) until the clip fits: still clear for a voice, and it plays everywhere.
// It also rewrites the header, whose sizes a streaming encoder may leave
// unset — some speakers refuse such a file.
// -----------------------------------------------------------------------------

const HEADER_SIZE = 44;
const PCM_FORMAT = 1;
const MAX_FACTOR = 6;

/**
 * Locate the PCM samples of a WAV file.
 * @param {Buffer} buffer
 * @returns {{ channels: number, sampleRate: number, data: Buffer } | null}
 *   null when the file is not 16-bit PCM WAV
 */
export function parseWav(buffer) {
  if (
    buffer.length < HEADER_SIZE ||
    buffer.toString('latin1', 0, 4) !== 'RIFF' ||
    buffer.toString('latin1', 8, 12) !== 'WAVE'
  ) {
    return null;
  }
  let format = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('latin1', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ' && start + 16 <= buffer.length) {
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      if (
        !format ||
        format.audioFormat !== PCM_FORMAT ||
        format.bitsPerSample !== 16 ||
        format.channels < 1 ||
        format.sampleRate < 1
      ) {
        return null;
      }
      // A streamed file declares a size of 0 or 0xFFFFFFFF: the samples then
      // run to the end of the file.
      const available = buffer.length - start;
      const length = size > 0 && size <= available ? size : available;
      const frameSize = format.channels * 2;
      return {
        channels: format.channels,
        sampleRate: format.sampleRate,
        data: buffer.subarray(start, start + length - (length % frameSize)),
      };
    }
    // Chunks are word-aligned.
    offset = start + size + (size % 2);
  }
  return null;
}

/** Build a canonical 16-bit PCM WAV file. */
export function buildWav({ channels, sampleRate, data }) {
  const header = Buffer.alloc(HEADER_SIZE);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'latin1');
  header.write('fmt ', 12, 'latin1');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(PCM_FORMAT, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'latin1');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Average `factor` consecutive frames into one: a cheap low-pass filter that
// keeps the aliasing of a plain decimation out of the voice.
function downsample({ channels, sampleRate, data }, factor) {
  const frameSize = channels * 2;
  const frames = Math.floor(data.length / frameSize / factor);
  const out = Buffer.alloc(frames * frameSize);
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      let sum = 0;
      for (let k = 0; k < factor; k += 1) {
        sum += data.readInt16LE((frame * factor + k) * frameSize + channel * 2);
      }
      out.writeInt16LE(Math.round(sum / factor), frame * frameSize + channel * 2);
    }
  }
  return { channels, sampleRate: Math.round(sampleRate / factor), data: out };
}

/**
 * Make a WAV file fit in `maxBytes`, lowering its sample rate when needed.
 * A file that is not 16-bit PCM WAV is returned untouched.
 * @param {Buffer} buffer
 * @param {number} maxBytes
 * @returns {Buffer}
 */
export function fitWav(buffer, maxBytes) {
  const wav = parseWav(buffer);
  if (!wav) {
    return buffer;
  }
  const budget = maxBytes - HEADER_SIZE;
  const factor = Math.min(MAX_FACTOR, Math.max(1, Math.ceil(wav.data.length / budget)));
  return buildWav(factor === 1 ? wav : downsample(wav, factor));
}
