// -----------------------------------------------------------------------------
// Buttons of the Configuration screen (manifest `actions`), and the connection
// status shown next to them. Each handler resolves the multi-language message
// displayed under its button.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { getCredits, listVoices } from './gradium.js';

const logger = createLogger({ name: 'actions' });

// Enough to find a voice, short enough to stay readable under a button.
const MAX_LISTED_VOICES = 60;

const MISSING_KEY = {
  en: 'Enter your Gradium API key, then save.',
  fr: 'Saisissez votre clé d’API Gradium, puis enregistrez.',
};

/** Multi-language explanation of a failed Gradium call. */
export function describeError(err) {
  if (err?.status === 401 || err?.status === 403) {
    return {
      en: 'Gradium refused the API key: check it in the configuration.',
      fr: 'Gradium a refusé la clé d’API : vérifiez-la dans la configuration.',
    };
  }
  if (err?.status === 402 || err?.status === 429) {
    return {
      en: 'Gradium refused the request: credits exhausted or too many requests.',
      fr: 'Gradium a refusé la requête : crédits épuisés ou trop de requêtes.',
    };
  }
  const reason = err?.message ?? String(err);
  return {
    en: `Gradium is unreachable (${reason}).`,
    fr: `Gradium est injoignable (${reason}).`,
  };
}

/**
 * Check the API key against Gradium.
 * @returns {Promise<{ connected: boolean, message: { en: string, fr: string } }>}
 */
export async function checkConnection(config) {
  if (!config.api_key) {
    return { connected: false, message: MISSING_KEY };
  }
  try {
    const { remaining, allocated } = await getCredits(config);
    if (remaining === null) {
      return {
        connected: true,
        message: { en: 'Connected to Gradium.', fr: 'Connecté à Gradium.' },
      };
    }
    const total = (locale) => (allocated === null ? '' : ` / ${allocated.toLocaleString(locale)}`);
    return {
      connected: true,
      message: {
        en: `Connected to Gradium. Remaining credits: ${remaining.toLocaleString('en-US')}${total('en-US')}.`,
        fr: `Connecté à Gradium. Crédits restants : ${remaining.toLocaleString('fr-FR')}${total('fr-FR')}.`,
      },
    };
  } catch (err) {
    logger.warn(`Connection check failed: ${err?.message ?? err}`);
    return { connected: false, message: describeError(err) };
  }
}

async function testConnection(config) {
  return (await checkConnection(config)).message;
}

async function showVoices(config) {
  if (!config.api_key) {
    return MISSING_KEY;
  }
  let voices;
  try {
    voices = await listVoices(config);
  } catch (err) {
    logger.warn(`Voice listing failed: ${err?.message ?? err}`);
    return describeError(err);
  }
  if (voices.length === 0) {
    return { en: 'No voice found on this account.', fr: 'Aucune voix trouvée sur ce compte.' };
  }
  voices.sort(
    (a, b) =>
      (a.language ?? 'zz').localeCompare(b.language ?? 'zz') || a.name.localeCompare(b.name),
  );
  const list = voices
    .slice(0, MAX_LISTED_VOICES)
    .map((voice) => `${voice.name}${voice.language ? ` (${voice.language})` : ''}: ${voice.uid}`)
    .join(' — ');
  const more = voices.length - MAX_LISTED_VOICES;
  return {
    en: `${voices.length} voices. ${list}${more > 0 ? ` — and ${more} more in Gradium Studio.` : ''}`,
    fr: `${voices.length} voix. ${list}${more > 0 ? ` — et ${more} autres dans Gradium Studio.` : ''}`,
  };
}

// Manifest action key -> handler (checked by test/manifest.test.js).
export const ACTIONS = {
  test_connection: testConnection,
  list_voices: showVoices,
};
