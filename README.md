# Gradium for Gladys Assistant

An **external integration** that makes [Gladys Assistant](https://gladysassistant.com)
speak with the voices of [Gradium](https://gradium.ai): natural, expressive
text-to-speech in English, French, German, Spanish and Portuguese.

Gradium registers as a **text-to-speech provider** (manifest `type: "tts"`,
Gladys **5.3.0** or later). Once an administrator selects it in the **Voice**
card of the Artificial Intelligence page, Gladys speaks through it:

- the "play a notification" scene action, on the speakers;
- the replies of the voice assistant.

User documentation: [English](docs/en.md) · [Français](docs/fr.md).

## Features

| Feature               | Detail                                                                         |
| --------------------- | ------------------------------------------------------------------------------ |
| Voice per language    | A default voice, plus an optional voice for `en`, `fr`, `de`, `es`, `pt`       |
| Any Gradium voice     | Catalog voices and your own cloned or designed voices, by identifier           |
| Region                | Automatic, Europe (`eu.api.gradium.ai`) or United States (`us.api.gradium.ai`) |
| Speaking pace         | Gradium `padding_bonus`, from `-4` (faster) to `4` (slower)                    |
| Audio format          | WAV (plays everywhere) or Opus in Ogg (lighter)                                |
| "Test the connection" | Checks the API key and shows the remaining credits                             |
| "List the voices"     | Shows the name, language and identifier of every available voice               |
| Connection status     | The Configuration screen tells when the key is missing or refused              |

Gladys accepts a clip of 5 MB at most, and Gradium answers 48 kHz WAV (about
52 seconds in 5 MB). A longer WAV clip is resampled to 24, 16 or 12 kHz to fit
rather than refused (see [`src/wav.js`](src/wav.js)).

Gradium also offers speech-to-text, but Gladys has no integration type for it
yet: this integration only covers text-to-speech.

## Project structure

```
.
├─ index.js                          # SDK wiring: handlers registered before connect()
├─ src/
│  ├─ tts.js                         # onTtsSynthesize: text + language -> audio clip
│  ├─ gradium.js                     # Gradium REST client (TTS, voices, credits)
│  ├─ wav.js                         # WAV parsing, header repair, resampling
│  ├─ actions.js                     # Configuration buttons + connection check
│  └─ config.js                      # config defaults, normalization, voice choice
├─ docs/en.md, docs/fr.md            # user documentation, re-hosted by Gladys
├─ test/                             # unit tests (node --test), no network
├─ gladys-assistant-integration.json # manifest
├─ Dockerfile                        # Node 24 Alpine, read-only rootfs ready
├─ CHANGELOG.md                      # Keep a Changelog, rolled by the Release workflow
└─ cover.jpg                         # catalog cover, 800×534 px
```

It is built on the official
[JavaScript template](https://github.com/GladysAssistant/integration-template-js)
and on [`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency.

## Gradium API used

All calls carry the API key in the `x-api-key` header
([Gradium documentation](https://docs.gradium.ai/guides/introduction)).

| Call                                         | Used for                 |
| -------------------------------------------- | ------------------------ |
| `POST /api/post/speech/tts`                  | Synthesizing a text      |
| `GET /api/voices/?limit=0&include_catalog=1` | "List the voices" button |
| `GET /api/usages/credits`                    | "Test the connection"    |

## Run it locally

```bash
npm install
```

```bash
GLADYS_HOST_API_URL="http://localhost:1443" GLADYS_INTEGRATION_TOKEN="<token>" GLADYS_INTEGRATION_SELECTOR="gradium" LOG_LEVEL=debug npm start
```

The three `GLADYS_*` variables are injected by the Gladys supervisor when the
integration runs inside its container. The Gradium API key is entered in the
Configuration screen of Gladys, never in an environment variable.

## Quality checks

```bash
npm run format:check   # Prettier
npm run lint           # ESLint
npm test               # unit tests, against the fake Gladys of the SDK
```

The CI runs the three on Node 22 and 24 and builds the Docker image. Before a
release, the store validator checks the whole integration:

```bash
npx github:GladysAssistant/integration-store .
```

## Publishing

1. Add the GitHub topic `gladys-assistant-integration` to the repository,
   which must be public with the manifest on its default branch (`main`).
2. Describe the changes under `## [Unreleased]` in
   [`CHANGELOG.md`](CHANGELOG.md).
3. Open **Actions → Release → Run workflow** and pick `patch`, `minor` or
   `major`. The workflow bumps the version everywhere, tags, builds the
   `linux/amd64` + `linux/arm64` image to `ghcr.io` and publishes the GitHub
   Release. Never edit a version by hand.
4. The Gladys indexer picks up the new manifest version and offers the
   install or the update.

## License

Apache-2.0
