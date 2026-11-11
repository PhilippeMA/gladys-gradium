// -----------------------------------------------------------------------------
// Gradium REST client (https://docs.gradium.ai).
//
// Only what the integration needs: one-shot speech synthesis, the voice list
// and the credit balance. Node 22+ provides `fetch`: no dependency needed.
// The API key travels in the `x-api-key` header and is never logged.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'gradium' });

// Same API and same keys on the three hosts; `eu` / `us` pin where the data is
// processed.
const BASE_URLS = {
  default: 'https://api.gradium.ai/api/',
  eu: 'https://eu.api.gradium.ai/api/',
  us: 'https://us.api.gradium.ai/api/',
};

// Gladys awaits a synthesis for 30 s: fail before it does, with our own reason.
const TTS_TIMEOUT_MS = 25_000;
const DEFAULT_TIMEOUT_MS = 10_000;

/** Error of a Gradium call, with the HTTP status when there is one. */
export class GradiumError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GradiumError';
    this.status = status;
  }
}

export function baseUrl(region) {
  return BASE_URLS[region] ?? BASE_URLS.default;
}

async function request(config, route, { method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  if (!config.api_key) {
    throw new GradiumError('The Gradium API key is not configured', 401);
  }
  const url = new URL(route, baseUrl(config.region));
  logger.debug(`${method} ${url.pathname}`);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'x-api-key': config.api_key,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timed out' : (err?.message ?? 'network error');
    throw new GradiumError(`Gradium request failed: ${reason}`);
  }

  if (!response.ok) {
    throw new GradiumError(
      `Gradium HTTP ${response.status}${await errorDetail(response)}`,
      response.status,
    );
  }
  return response;
}

// Gradium explains its refusals in a JSON `detail` (or `error`) field.
async function errorDetail(response) {
  try {
    const raw = await response.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.detail ?? parsed.error ?? raw;
    } catch {
      // Not JSON: keep the text.
    }
    if (typeof detail !== 'string') {
      detail = JSON.stringify(detail);
    }
    detail = detail.trim().slice(0, 200);
    return detail ? `: ${detail}` : '';
  } catch {
    return '';
  }
}

/**
 * Synthesize a text in one request.
 * @param {object} config normalized configuration
 * @param {{ text: string, voiceId: string, outputFormat: 'wav' | 'opus' }} options
 * @returns {Promise<Buffer>} the audio file (WAV, or Opus in an Ogg container)
 */
export async function synthesize(config, { text, voiceId, outputFormat }) {
  const body = {
    text,
    voice_id: voiceId,
    output_format: outputFormat,
    only_audio: true,
  };
  if (config.speed) {
    // The model settings travel as a JSON string.
    body.json_config = JSON.stringify({ padding_bonus: config.speed });
  }
  const response = await request(config, 'post/speech/tts', {
    method: 'POST',
    body,
    timeout: TTS_TIMEOUT_MS,
  });
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) {
    throw new GradiumError('Gradium returned an empty audio clip');
  }
  return audio;
}

/**
 * Remaining and allocated credits of the account.
 * @returns {Promise<{ remaining: number | null, allocated: number | null }>}
 */
export async function getCredits(config) {
  const response = await request(config, 'usages/credits');
  const body = await response.json();
  const number = (...values) => {
    const found = values.find((value) => Number.isFinite(Number(value)) && value !== null);
    return found === undefined ? null : Number(found);
  };
  return {
    remaining: number(body?.remaining, body?.remaining_credits),
    allocated: number(body?.allocated, body?.allocated_credits),
  };
}

/**
 * Voices the account can use: its own (cloned / designed) voices and the
 * Gradium catalog.
 * @returns {Promise<Array<{ uid: string, name: string, language: string | null }>>}
 */
export async function listVoices(config) {
  const response = await request(config, 'voices/?limit=0&include_catalog=1');
  return extractVoices(await response.json());
}

// The answer groups the voices in one or several lists: collect every object
// carrying a `uid`, wherever it sits, without duplicates.
export function extractVoices(body) {
  const voices = new Map();
  const visit = (node, depth) => {
    if (depth > 4 || node === null || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof node.uid === 'string' && node.uid) {
      if (!voices.has(node.uid)) {
        voices.set(node.uid, {
          uid: node.uid,
          name: typeof node.name === 'string' && node.name ? node.name : node.uid,
          language: typeof node.language === 'string' && node.language ? node.language : null,
        });
      }
      return;
    }
    Object.values(node).forEach((value) => visit(value, depth + 1));
  };
  visit(body, 0);
  return [...voices.values()];
}
