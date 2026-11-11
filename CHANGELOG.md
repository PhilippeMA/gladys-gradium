# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Gradium as a text-to-speech provider for Gladys (Gladys 5.3.0 or later): the
  "play a notification" scene action and the voice assistant speak with a
  Gradium voice.
- A default voice, plus an optional voice per language (English, French,
  German, Spanish, Portuguese) chosen from the language of the user.
- Settings for the region (automatic, Europe, United States), the speaking
  pace and the audio format (WAV or Opus).
- "Test the connection" button, showing the remaining credits, and "List the
  voices" button, showing the identifiers of the available voices.
- Long WAV clips are resampled to stay under the 5 MB limit of Gladys.

[Unreleased]: https://github.com/PhilippeMA/gladys-gradium/commits/main
