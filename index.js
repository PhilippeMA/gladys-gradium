// -----------------------------------------------------------------------------
// Entry point of the Gradium integration for Gladys Assistant.
//
// SDK wiring only: the handlers are registered BEFORE connect(), the work
// lives in src/. The Gladys supervisor provides GLADYS_HOST_API_URL,
// GLADYS_INTEGRATION_TOKEN and GLADYS_INTEGRATION_SELECTOR to the container;
// the SDK reads them: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import { ACTIONS, checkConnection } from './src/actions.js';
import { synthesizeSpeech } from './src/tts.js';

const gladys = new GladysIntegration();

// Current configuration (hot-reloaded via onConfigUpdated).
let config = normalizeConfig();

// --- Text-to-speech: Gladys asks for a clip ----------------------------------
// A throw fails the scene action visibly and makes the voice assistant answer
// in text only: the SDK acks the failure with the message.
gladys.onTtsSynthesize((text, language) => synthesizeSpeech(config, text, language));

// --- Manifest actions: buttons in the Configuration screen -------------------
for (const [actionKey, handler] of Object.entries(ACTIONS)) {
  gladys.onAction(actionKey, () => handler(config));
}

// Check the API key and report the result in the Configuration screen. The
// container can be RUNNING and still unable to reach Gradium.
async function reportConnection() {
  const { connected, message } = await checkConnection(config);
  await gladys.setConnectionStatus(connected, connected ? undefined : message);
}

// --- Configuration updated by the user ---------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> new configuration received');
  config = normalizeConfig(newConfig);
  await reportConnection();
});

// --- Connection lifecycle ----------------------------------------------------
// The SDK logs the WebSocket lifecycle itself (under the `gladys-sdk` name).
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    await reportConnection();
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
    await gladys
      .setConnectionStatus(false, {
        en: 'Initialization failed, check the integration logs.',
        fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
      })
      .catch(() => {});
  }
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
});

// --- Startup -----------------------------------------------------------------
logger.info('Starting the Gradium integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
