# opencode-handsfree

Hands-free bidirectional voice for **OpenCode Desktop**.

[![CI](https://github.com/antmarpen/OpenCode-HandsFree/actions/workflows/ci.yml/badge.svg)](https://github.com/antmarpen/OpenCode-HandsFree/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenCode Desktop](https://img.shields.io/badge/OpenCode-Desktop-blue)](https://opencode.ai)

[English](README.md) | [Español](README.es.md)

## What it does

- **Dictation**: records the microphone, transcribes it with a local speech-to-text model or an OpenAI-compatible provider, and leaves the text in the composer.
- **Spoken replies**: reads each assistant text block aloud with the operating system voice or a cloud text-to-speech engine.
- **Conversation mode (experimental)**: listens on its own, closes the turn when it detects silence, sends the message, reads the reply, and starts listening again.
- **Per-chat switches** for input and output, persisted per session, plus a settings page under **Settings > Voice**.

## Requirements

- **OpenCode Desktop** with the experimental GUI plugin API. The GUI part is loaded only from the plugin entry in the **global** `opencode.json(c)`.
- **Platform**: only Windows has been tested at runtime. The macOS and Linux local engine paths exist in the code but have not been verified; CI only checks that the project builds on Linux.
- **Node.js** `20.19+` or `22.12+` to build (Vite 7).
- **Local dictation** (optional): a speech-to-text CLI compatible with `whisper.cpp` (`whisper-cli`, `main.exe`, ...) and a `ggml-*.bin` model. The plugin records 16 kHz mono WAV, so no ffmpeg is needed.
- **Local replies** (optional): SAPI voices on Windows, `say` on macOS, `espeak-ng` on Linux.
- **Cloud** (optional): any provider that implements the OpenAI `/audio/transcriptions` and `/audio/speech` contract.

## How it works

1. The window records the microphone and encodes a 16 kHz mono WAV in memory.
2. The main process transcribes it with the local CLI or the configured provider and returns the text.
3. The text goes to the chat composer, or is sent as a prompt when auto-send is on.
4. When the assistant finishes a text block, the plugin synthesizes it with the local voice or cloud TTS and plays it in the window, so the output device can be chosen.
5. Conversation mode chains those steps: it listens, closes the turn on silence, sends the prompt, reads the reply and listens again.

API keys and provider credentials stay in the main process. The window only sends text and base64 audio, and the audio is removed from the temporary folder after each request.

## Install

### From npm (recommended)

The published package ships the GUI bundle prebuilt, so nothing is compiled on your machine.

```sh
opencode plugin add opencode-handsfree
```

Or add it to the `plugins` array of your **global** `opencode.jsonc` (usually `%USERPROFILE%\.config\opencode\opencode.jsonc` on Windows or `~/.config/opencode/opencode.jsonc` elsewhere):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-handsfree"]
}
```

Pin a version with `opencode-handsfree@0.1.0`. Restart OpenCode Desktop after the first install.

### From source

For development, clone the repository, install dependencies and build once, then point `plugins` at the absolute path:

```powershell
git clone https://github.com/antmarpen/OpenCode-HandsFree.git
cd opencode-handsfree
npm ci
npm run build
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["C:/path/to/opencode-handsfree"]
}
```

After every rebuild the GUI part reloads in all windows; a new Ipc method needs a full restart.

## Usage

### Shortcuts and commands

| Action | How |
| --- | --- |
| Start or stop dictation | `mod+shift+space`, `/dictate`, or the microphone icon |
| Dictate with an empty prompt | `Enter` |
| Turn voice on or off for this chat | `/voice on`, `/voice off` |
| Pick a direction | `/voice input`, `/voice output` |
| Open the settings page | `/voice settings` |
| Read or silence replies | `/speak`, `/shush` |
| Cancel recording or transcription | `Escape` (otherwise it interrupts the session as usual) |

With `autoSend` off, the transcript is inserted into the composer for review. With it on, the message is sent as soon as the transcription finishes.

### Composer pill

- While recording it shows the live waveform (64 symmetric bars) and a `✕` at the end that cancels the dictation; while transcribing, the icon and the `✕` stay in the pill.
- The microphone only appears when dictation has a provider configured and the chat's dictation switch is on.
- While a reply is being read, the same pill shows a **stop** that cuts the queued audio and the current playback.
- In conversation mode the pill switches to the conversation icon; pressing it starts the loop.

| Recording | Transcribing | Conversation mode |
| --- | --- | --- |
| ![Composer pill while recording](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/dictate-recording.png) | ![Composer pill while transcribing](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/dictate-transcribe.png) | ![Composer pill in conversation mode](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/conversation.png) |

### Chat header

- The gear is always visible and opens a popover with the two switches (input and output) aligned right and a link to **Settings > Voice**.
- The microphone and speech-bubble icons appear only when their direction is configured.
- Every chat keeps its own switches through the plugin session store; new chats inherit the defaults from the settings.
- The dictation switch is the single gate: when it is off there is no microphone icon, `Enter` and the shortcut do not dictate, and turning it off while recording or transcribing cancels the work.

![Chat header voice menu](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/session-header-options.png)

### Conversation mode

- It drives the microphone, the assistant turn and the playback as a single loop. While it is on, the input and output switches stay locked together.
- Speaking while the reply is being read cuts the playback and sends your turn when you stop.
- With a reply playing, the end of the pill shows the stop that only silences the voice.
- `✕`, `Escape`, or pressing the pill again stops the loop and leaves the mode ready to start over.
- The loop stops if you switch to another chat. The microphone stays open while waiting and while reading, so headphones are recommended on speakers.

## Settings > Voice

The page has three tabs and also sets the defaults for the per-chat switches.

Manual API keys are encrypted at rest with the operating system keychain (`safeStorage`, DPAPI on Windows) and are never written to `opencode.json` or the logs. If the keychain is unavailable the key is stored as plain text and a warning is written to the log.

### Input

![Input settings](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-input.png)

- Engine: `Local` or `Cloud`.
- Microphone: any input device or the system default.
- Provider: reuse an OpenCode provider (its base URL and credential are used automatically, so no URL or key is needed) or `Manual` with the plugin's own URL and key.
- Models load only after the provider or URL/key is set. Changing the provider clears the selected model. The picker is a searchable dialog that lists every model (audio models first); if the provider returns models you must pick one, and the text field is only a fallback when none load.
- Local engine: path or command of the speech-to-text binary, model file and language.

* * *

### Output

![Output settings](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-output.png)

- Engine: `Local` or `Cloud`.
- Output device: any sink or the system default.
- Cloud: model, voice and response format, with the same provider/manual rules as input.
- Local: the system voice must be enabled explicitly before replies can be read; voices are listed from the OS and the rate is adjustable.
- **Test** plays a short sample with the current output settings.

* * *

### Experimental

![Experimental settings](https://raw.githubusercontent.com/antmarpen/OpenCode-HandsFree/main/docs/screenshots/settings-experimental.png)

- Start new chats in conversation mode.
- Silence after speech that closes a turn (1200 ms by default).
- Close the microphone while the window is not focused.

## Development

```powershell
npm run watch   # rebuild dist/gui-experimental.cjs on change
npm run typecheck
npm run build
```

Each rebuild reloads the GUI in every window. If you add or change **Ipc methods**, restart OpenCode Desktop so the main process registers the new contract; the log line `voice: main ready { version }` shows which bundle main loaded. There is no automated test suite yet; the pure helpers (`text.ts`, `audio/wav.ts`, `audio/meter.ts`, `main/urls.ts`) are kept free of host APIs so tests can be added.

## Project structure

- `src/index.ts`, `src/rpc.ts`: minimal server half (plugin id and the credential RPC).
- `src/gui.tsx`: GUI entry that composes the definition, the window setup and the main process.
- `src/gui/audio/`: pure WAV, metering and device helpers.
- `src/gui/main/`: secrets, credentials, process runner, transcription, speech, models, voices and temp files.
- `src/gui/window/`: dictation, conversation loop, delivery, playback, replies, commands, pill and header.
- `src/gui/settings/`: settings page, rows, provider and model/voice pickers.
- `src/gui/i18n/`: English and Spanish catalogs.

## Security

- API keys are encrypted with the operating system keychain (`safeStorage`/DPAPI) and are never written to `opencode.json` or the logs. When a cloud engine is active, a key is sent only to the provider endpoint you configured.
- Provider credentials are resolved on demand through the local server half, so the plugin never copies them into its own storage.
- Dictation clips and synthesized replies are written to the OS temporary directory only while a request runs and are deleted afterwards.

## Behavior notes

- Audio is captured in the window and sent to the main process as base64 WAV. The main process synthesizes the voice and the window plays it with `<audio>` and `setSinkId`, which is the only way to choose the output device; Chromium decodes WAV and MP3 without external programs.
- Replies are queued per window: a long answer does not overwrite itself, and starting a dictation cuts the queue and the current playback.
- Reading is triggered by `session.text.ended` for each text block and ignores child (subagent) sessions.
- Text is cleaned of Markdown and URLs before speaking, but inline code is kept because it is usually the point of the sentence; code blocks are skipped. Sentences are chunked at about 600 characters.
- Tables are read as cell sentences; rules, checkboxes, images, footnotes, emoji, formulas and stray brackets are dropped. Links are read by their text; a written address is spoken without its scheme or query, with the separators named.
- Dictation does not stop on a pause: press the shortcut or the microphone again to stop and transcribe. A silent capture is reported differently from "no voice detected".
- Cloud output in `mp3`, `wav`, `opus`, `aac` or `flac` is decoded in the window. If the provider answers with JSON or text, the error shows the body.
- Disable the whole plugin in **Settings > Extensions > Plugins**, or remove its entry from the config.
- Logs: `~/.local/share/opencode/log/opencode.log`.

## Cloud contract

The cloud path assumes the OpenAI `/audio/transcriptions` and `/audio/speech` contract. For a different format, change `transcribeCloud` in `src/gui/main/transcribe-cloud.ts` and `speakCloud` in `src/gui/main/speech-cloud.ts`; nothing else needs to change.

## Limitations

- The GUI plugin API is experimental and may change between releases.
- Conversation mode on speakers can hear its own voice; use headphones to interrupt by speaking.
- The GUI part is loaded only from the entry in the global configuration.
- Local voices depend on the OS: SAPI on Windows, `say` on macOS, `espeak-ng` on Linux. Only the Windows path has been tested.

## License

MIT. See [LICENSE](./LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md).
