# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** making Gladys speak with the
[Gradium](https://gradium.ai) voices: a text-to-speech provider (manifest
`type: "tts"`, Gladys 5.3.0+). A Node.js service (Node 22+, ESM, no build
step) that runs in its own sandboxed Docker container and talks to Gladys
through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It started from the official JavaScript template.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/tts.test.js              # one file
node --test --test-name-pattern "voice"   # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                          SDK wiring only: handlers registered before connect()
src/tts.js                        onTtsSynthesize: text + language -> "<type>;base64,<clip>"
src/gradium.js                    Gradium REST client (TTS, voices, credits)
src/wav.js                        WAV parsing, header repair, resampling under 5 MB
src/actions.js                    manifest `actions` handlers + connection check
src/config.js                     DEFAULT_CONFIG (mirrors the manifest defaults) + normalization
gladys-assistant-integration.json manifest: name, config_schema, actions, image...
docs/en.md, docs/fr.md            user documentation, re-hosted by Gladys (mandatory)
test/                             node --test, against the SDK's fake Gladys (integration-sdk/testing)
.github/scripts/release.mjs       release helpers (manifest bump, changelog), tested in test/
```

## Rules

- **Stored keys are forever.** Users store the manifest `config_schema` keys
  (`api_key`, `voice_fr`...) and `actions` keys: renaming one loses their
  setting.
- **Secrets.** The Gradium API key only travels in the `x-api-key` header.
  Never log it, never put it in an error message or a URL.
- **The TTS contract.** Gladys sends 2,000 characters at most and awaits the
  clip 30 s; the clip is `audio/mpeg`, `audio/wav`, `audio/ogg` or `audio/aac`,
  5 MB decoded at most. Gradium has no MP3 output: WAV and Opus (Ogg) only.
- **The container rootfs is read-only.** Write only under `/data`.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading: the Release workflow moves the section.
- **Manifest.** Texts are multi-language objects `{ "en": ..., "fr": ... }`:
  `label`, `description` and `placeholder` alike, never a plain string. The
  catalog `description` holds 10 to 100 characters per language.
  `test/manifest.test.js` ties the manifest to the code (defaults, config
  keys, action handlers): change both sides together.
- **User-facing text** is bilingual (English and French): action messages,
  manifest texts, and `docs/en.md` / `docs/fr.md`, kept in sync.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network: they replace `globalThis.fetch`.
