# Nakamura Voice — STT + TTS for OpenCode

[Português](README.pt-BR.md) · **English**

Dictate messages into the composer and have replies read aloud. Zero
configuration for speech: free Microsoft Edge voices, no API key. Optional
local Kitsune-TTS for offline anime voices.

## Install (2 minutes)

### Ask your agent

Paste this into OpenCode:

> Install the voice plugin `opencode-plugin-voice` and set up pt-BR read-aloud.

The agent runs the command for you.

### Or do it yourself

```bash
opencode plugin add opencode-plugin-voice
```

Until the npm release is available, install straight from GitHub:

```bash
opencode plugin add github:NakamuraIA/opencode-plugin-voice
```

Then open **Settings → Voice**, pick a voice (e.g. `pt-BR-FranciscaNeural`) and
press **Play sample**.

Read-aloud works with **no API key**. Dictation needs an OpenRouter/Groq key or
a local Whisper server.

## What it does

- **Dictation (STT)** — mic button in the composer; the transcription is
  inserted into the prompt.
  - **OpenRouter** — 30+ transcription models.
  - **Groq** — `whisper-large-v3-turbo` / `whisper-large-v3`.
  - **Local** — any OpenAI-compatible server (`faster-whisper-server`,
    `whisper.cpp`, …).
- **Read aloud (TTS)** — header button reads the latest reply, plus optional
  **auto read-aloud** when the session goes idle.
- **Streaming** — one continuous audio stream per reply, no character limit;
  the first words start while the rest is still being synthesized.
- **Local Kitsune-TTS (optional)** — 5 anime voices, offline, no key.
- **Settings page** — live microphone test, voice sample, provider/model/voice
  fields.

## Requirements

- **OpenCode Desktop 2.x** (the GUI part uses the experimental GUI API).
- Read aloud: internet; Edge TTS needs no key.
- Dictation: OpenRouter key, Groq key, or an OpenAI-compatible local Whisper
  server.
- Optional Kitsune pack: Windows 10/11, Python 3.10+, eSpeak NG.

## Settings

| Section | Field | Notes |
|---|---|---|
| TTS | Engine | `edge` (default), `kitsune` (local), `openai` (VoiceBox/compatible) |
| TTS | Voice | Edge voice name, e.g. `pt-BR-FranciscaNeural` |
| TTS | Rate | `0.5`–`2.0` |
| TTS | Auto read-aloud | reads each finished reply |
| TTS | Kitsune URL / voice / script | custom local server (advanced) |
| TTS | API URL / model / voice | OpenAI-compatible gateway |
| STT | Provider | `openrouter`, `groq`, `local` |
| STT | Model / language / prompt | transcription options |
| STT | API keys | stored locally in plugin storage |

## Local Kitsune-TTS (optional)

The official Kitsune-TTS (GPL-3.0) is a local server with 5 voices. The
one-click pack lives in `tools/kitsune-local/`.

```powershell
powershell -ExecutionPolicy Bypass -File tools/kitsune-local/setup.ps1
```

Start it with:

```text
%LOCALAPPDATA%\KitsuneTTS\start_server.bat
```

Then in **Settings → Voice** choose engine **OpenAI / VoiceBox**:

- URL: `http://127.0.0.1:8092`
- Model: `kitsune`
- Voice: `frieren` (or `emilia`, `zerotwo`, `violet`, `hiro`)

If the local server is not running, the plugin **falls back to Edge**
automatically. See `tools/kitsune-local/README.md`.

### Nyra & Hana (beta)

A fine-tuned Kitsune-TTS with two PT-BR voices (Nyra and Hana) is published at
[huggingface.co/Nakamuraa/kitsune-tts-nyra-hana-beta](https://huggingface.co/Nakamuraa/kitsune-tts-nyra-hana-beta)
(GPL-3.0, beta). It uses the same local server on port 8091; follow the model
card to install. Browser demo:
[nakamuraa-kitsune-tts-nyra-hana-demo.static.hf.space](https://nakamuraa-kitsune-tts-nyra-hana-demo.static.hf.space).

## Commands

- `Dictate a message` — start/stop recording (default: Ctrl+Shift+D).
- `Read the last reply aloud` — streams sentence by sentence.
- `Pause or resume read-aloud`.
- `Toggle auto read-aloud`.

Press **Esc** anywhere to cancel a recording or stop the read-aloud.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Read-aloud is silent (Edge) | `opencode plugin update` — Edge rotates its internal token; a plugin update fixes it. |
| Dictation says a key is missing | Settings → Voice → STT: set the OpenRouter/Groq key or a local server URL. |
| Kitsune silent | Check `http://127.0.0.1:8091/health` (custom) or `:8092` (official pack). The plugin falls back to Edge. |
| Plugin not listed | `opencode plugin list`; restart the app after the first install. |
| Settings → Voice missing | The GUI part loads only when the server part does; restart the app. |

## Privacy

- Microphone audio is recorded only while dictating and sent only to the
  selected STT provider.
- Read-aloud text goes to Microsoft Edge, unless you use a local Kitsune or an
  OpenAI-compatible server.
- No telemetry. Keys and settings live in local plugin storage.

## Development

```bash
npm install
npm run build        # dist/gui-experimental.cjs
npm run typecheck
npm test             # splitForSpeech / cleanForSpeech
npx --yes tsx tests/smoke.mjs
```

See `tests/README.md`.

## License

MIT — see [LICENSE](LICENSE).

Kitsune-TTS (optional pack) is GPL-3.0 by Heitorkk2, Everteson and Nakamura;
the pack downloads it from the official sources. Edge TTS via `msedge-tts`
(MIT).
