// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys, from the `config_schema` declared in
// `gladys-assistant-integration.json`. This module provides the defaults and
// normalizes the received object, so the rest of the code never has to deal
// with `undefined` or with a number that arrived as a string.
// -----------------------------------------------------------------------------

// Languages Gradium voices exist in. Each one has its own optional voice field
// (`voice_<language>`) in the manifest.
export const VOICE_LANGUAGES = ['en', 'fr', 'de', 'es', 'pt'];

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (checked by test/manifest.test.js).
export const DEFAULT_CONFIG = {
  api_key: '',
  region: 'default', // 'default' | 'eu' | 'us'
  // "Emma", the voice of the Gradium quick start.
  voice_default: 'YTpq7expH9539ERJ',
  voice_en: '',
  voice_fr: '',
  voice_de: '',
  voice_es: '',
  voice_pt: '',
  output_format: 'wav', // 'wav' | 'opus'
  // Gradium "padding bonus": negative speaks faster, positive slower.
  speed: 0,
};

export const SPEED_MIN = -4;
export const SPEED_MAX = 4;

const REGIONS = ['default', 'eu', 'us'];
const OUTPUT_FORMATS = ['wav', 'opus'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} [raw] config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw ?? {};
  const speed = Number(source.speed ?? DEFAULT_CONFIG.speed);
  const config = {
    api_key: text(source.api_key),
    region: REGIONS.includes(source.region) ? source.region : DEFAULT_CONFIG.region,
    // An emptied field falls back to the default voice: there is always one.
    voice_default: text(source.voice_default) || DEFAULT_CONFIG.voice_default,
    output_format: OUTPUT_FORMATS.includes(source.output_format)
      ? source.output_format
      : DEFAULT_CONFIG.output_format,
    speed: Number.isFinite(speed) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)) : 0,
  };
  for (const language of VOICE_LANGUAGES) {
    config[`voice_${language}`] = text(source[`voice_${language}`]);
  }
  return config;
}

/**
 * Voice to speak a text with: the voice of the requested language when the
 * user set one, the default voice otherwise.
 * @param {ReturnType<typeof normalizeConfig>} config
 * @param {string | null | undefined} language e.g. 'fr', 'fr-FR', null
 */
export function voiceFor(config, language) {
  const code = typeof language === 'string' ? language.trim().slice(0, 2).toLowerCase() : '';
  return (VOICE_LANGUAGES.includes(code) && config[`voice_${code}`]) || config.voice_default;
}
