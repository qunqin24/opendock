# opencode-speech-to-text

> [!IMPORTANT]
> **This project is no longer maintained.** The plugin keeps working as it
> is, but it won't get updates or fixes, and issues and pull requests won't be
> reviewed. Very good speech-to-text tools now exist, so there's no need for
> another one.
>
> **Try these instead:**
>
> - **[Simple Voice](https://github.com/yuyudhan/simple-voice)** — our free,
>   open-source macOS dictation app. It works in every app, including
>   opencode, runs on-device by default and sends no data. Install:
>   `curl -fsSL https://github.com/yuyudhan/simple-voice/releases/latest/download/install.sh | bash`
> - **[FluidVoice](https://github.com/altic-dev/FluidVoice)** — open-source
>   macOS dictation with on-device speech-to-text.
> - **[Wispr Flow](https://wisprflow.ai)** — a polished commercial dictation
>   app for macOS, Windows and iOS.

Push-to-talk speech-to-text for [opencode](https://opencode.ai) —
record with **Ctrl+'**, transcribe with Groq Whisper, and drop the
cleaned text straight into your prompt.

## Features

- **Push-to-talk** recording via sox (**Ctrl+'** toggles start/stop)
- **Groq Whisper** transcription (OpenAI and custom endpoints too)
- **LLM cleanup** pass — fixes punctuation and coding homophones
  (pie→pi, Jason→JSON, cash→cache, …)
- **Languages** — auto-detect or pick one of several
- **Mic picker** + **persistent preferences** across sessions

## Prerequisites

- **sox** — `brew install sox`
- **GROQ_API_KEY** — get one at [console.groq.com](https://console.groq.com)

## Install

The simplest way — let opencode wire up both targets and install it:

```bash
opencode plugin opencode-speech-to-text -gf
```

This is a **TUI plugin**, so its real entry must be registered in
`tui.json` (not `opencode.json`). To wire it manually, add it to the
`plugin` array in **`tui.json`**:

```jsonc
// ~/.config/opencode/tui.json
{
    "$schema": "https://opencode.ai/tui.json",
    "plugin": ["opencode-speech-to-text"],
}
```

Restart opencode after installing — TUI plugins load at startup.

## Usage

Press **Ctrl+'** to start recording, speak, then press **Ctrl+'**
again to stop. The transcription is cleaned up and appended to your
prompt. You can also run **`/voice`** (works in any terminal, even when
`Ctrl+'` can't be transmitted).

### Change the shortcut

`Ctrl+'` needs a terminal that transmits modified keys (kitty/CSI-u
protocol). If yours doesn't, override the key via plugin options:

```jsonc
// tui.json
{ "plugin": [["opencode-speech-to-text", { "keybind": "ctrl+g" }]] }
```

## Commands

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `/voice`          | Toggle recording (start/stop) |
| `/voice-cancel`   | Cancel the current recording  |
| `/voice-provider` | Switch transcription provider |
| `/voice-model`    | Pick the Whisper model        |
| `/voice-mic`      | Pick the audio input device   |
| `/voice-language` | Set language or auto-detect   |

## Providers

| Provider | API key env      | Default model      |
| -------- | ---------------- | ------------------ |
| Groq     | `GROQ_API_KEY`   | `whisper-large-v3` |
| OpenAI   | `OPENAI_API_KEY` | `whisper-1`        |
| Custom   | (configurable)   | `whisper-large-v3` |

Cleanup runs on Groq Llama 3.3 70B (falls back to 3.1 8B) and also
uses `GROQ_API_KEY`.

## Development

```bash
pnpm install
pnpm run build
pnpm run lint
```

## License

MIT
