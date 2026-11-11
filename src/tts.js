// -----------------------------------------------------------------------------
// Text-to-speech provider: what Gladys calls to speak (manifest `type: "tts"`).
//
// Gladys relays the text (2,000 characters at most) and the language of the
// user; the handler resolves the clip as `<content type>;base64,<payload>`,
// 5 MB at most, within 30 s.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { voiceFor } from './config.js';
import { synthesize } from './gradium.js';
import { fitWav } from './wav.js';

const logger = createLogger({ name: 'tts' });

// Limit of the Gladys core, on the decoded clip.
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

// Gradium format -> content type Gladys serves the clip with.
const CONTENT_TYPES = {
  wav: 'audio/wav',
  opus: 'audio/ogg',
};

/**
 * @param {object} config normalized configuration
 * @param {string} text text to speak
 * @param {string | null} language language of the requesting user, when known
 * @returns {Promise<string>} `<content type>;base64,<payload>`
 */
export async function synthesizeSpeech(config, text, language) {
  const content = typeof text === 'string' ? text.trim() : '';
  if (!content) {
    throw new Error('Nothing to say: the text is empty');
  }
  const voiceId = voiceFor(config, language);
  const outputFormat = config.output_format;
  logger.info(
    `Synthesizing ${content.length} characters (language: ${language ?? 'unknown'}, voice: ${voiceId}, format: ${outputFormat})`,
  );

  let audio = await synthesize(config, { text: content, voiceId, outputFormat });
  if (outputFormat === 'wav') {
    audio = fitWav(audio, MAX_AUDIO_BYTES);
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    throw new Error(
      `The clip weighs ${(audio.length / 1024 / 1024).toFixed(1)} MB, Gladys accepts 5 MB: shorten the text`,
    );
  }
  return `${CONTENT_TYPES[outputFormat]};base64,${audio.toString('base64')}`;
}
