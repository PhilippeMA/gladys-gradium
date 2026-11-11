# Gradium

This integration makes Gladys speak with the voices of
[Gradium](https://gradium.ai), a text-to-speech service with natural and
expressive voices in English, French, German, Spanish and Portuguese.

Once selected as the voice of your instance, Gradium speaks:

- the **"play a notification"** scene action, on your speakers;
- the replies of the **voice assistant**.

Gradium is a cloud service: the texts to speak are sent to Gradium, and each
synthesis uses credits of your Gradium account.

## Requirements

- Gladys Assistant **5.3.0** or later.
- A Gradium account and an API key. The free plan is enough to try.

## Configuration

1. Sign in to [Gradium Studio](https://gradium.ai), open the **API keys**
   page and create a key. Copy it: it is shown only once.
2. In Gladys, open the **Configuration** tab of the integration, paste the key
   in **API key** and save.
3. Press **Test the connection**: the message shows your remaining credits.
4. Open the **Artificial Intelligence** page of Gladys and select **Gradium**
   in the **Voice** card. Until you do, Gladys keeps its previous voice.

## Choosing the voices

Gradium identifies a voice by a short identifier, such as `YTpq7expH9539ERJ`.

- Press **List the voices** to display the voices of the Gradium catalog and
  your own voices (cloned or designed in Gradium Studio), with their language
  and identifier. Gradium Studio also lets you listen to each voice and copy
  its identifier.
- **Default voice** is used whenever the language has no voice of its own.
- **French voice**, **English voice**, **German voice**, **Spanish voice** and
  **Portuguese voice** are optional. Gladys speaks in the language of the user
  who asked: fill in the voice of a language to use it for that language.

A voice speaks best in its own language: if your household uses French, put a
French voice in **French voice** (or in **Default voice**).

## Other settings

- **Region**: leave _Automatic_ unless you want your requests processed only
  in Europe or only in the United States.
- **Speaking pace**: `0` is the natural pace of the voice. Negative values
  (down to `-4`) speak faster, positive values (up to `4`) slower.
- **Audio format**: _WAV_ plays on every speaker. _Opus_ is much lighter and
  suits long texts, but some speakers, Sonos among them, cannot play it.

## Limits

- Gladys sends at most 2,000 characters per synthesis and accepts a clip of
  5 MB. In WAV, a clip longer than about 50 seconds is automatically stored at
  a lower sample rate to fit; the voice stays clear.
- A synthesis must complete within 30 seconds.
- Gradium offers speech-to-text too, but Gladys has no speech-to-text
  integration type yet: this integration only speaks.

## Troubleshooting

- **"Gradium refused the API key"**: the key is wrong or was revoked. Create a
  new one in Gradium Studio and paste it again.
- **"Credits exhausted or too many requests"**: check your balance with
  **Test the connection**, and your plan in Gradium Studio.
- **Gladys does not speak with Gradium**: check that Gradium is selected in
  the **Voice** card of the **Artificial Intelligence** page.
- **The speaker stays silent in Opus**: switch **Audio format** back to WAV.
- **The voice has an accent**: the voice does not match the language. Set a
  voice of that language in the matching field.

The **Logs** tab of the integration shows the reason of every failed
synthesis. The API key is never written to the logs.
