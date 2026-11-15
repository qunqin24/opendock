# OpenCode Dictation

[![npm](https://img.shields.io/npm/v/opencode-dictation)](https://www.npmjs.com/package/opencode-dictation)

Talk to [OpenCode](https://opencode.ai) instead of typing. A microphone sits in the prompt bar of the OpenCode CLI: click it and speak. Your words show up in the prompt as you talk, in grey, and become real text each time you pause. Click it again to stop, or press Enter to stop and send.

Speech is turned into text on your own computer with [Whisper](https://github.com/openai/whisper), through [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). It runs on the CPU, works offline, and no audio leaves your machine. There's nothing to compile and no Python: the audio and speech packages ship prebuilt for Windows, macOS and Linux. So far it has been tested on Windows 11; reports from macOS and Linux are welcome.

```
┃  Hello there. Please refactor the login function. Then add unit tests
┃  for the error cases.
┃
┃  Build · Claude Sonnet 5.5 Anthropic
╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
…/my-project  ● listening ▅▇▆  shift+tab agents  ctrl+p commands
```

## Install

Needs OpenCode 2.

```bash
opencode plugin add opencode-dictation
```

That installs it [from npm](https://www.npmjs.com/package/opencode-dictation). To get the latest code from GitHub instead: `opencode plugin add github:Smartulf123/opencode-dictation`.

Restart OpenCode. The first time you dictate, the speech model (about 155 MB) is downloaded once into `~/.cache/opencode-dictation`.

## Use

| To | Do |
|---|---|
| Start dictating | Click **🎙** in the prompt bar, press **alt+v**, or type **`/dictate`** |
| Stop (keep the text to edit) | Click the red **●**, or press **alt+v** again |
| Stop and send | Press **Enter** (the last words are written first) |
| Throw the recording away | Press **Esc** |
| Pick a microphone | `/dictate-mic` |
| Pick a speech model | `/dictate-model` |

While you dictate, the prompt bar shows a red dot and "listening", with level bars while you speak. The words you're saying appear in the prompt as a grey draft that updates as you go; when you pause for about half a second the draft is replaced by the final text (a "…" shows for the moment that takes). Everything goes in at the cursor, so you can mix typing and speaking. A phrase that starts a new sentence gets a capital letter, and Whisper's noise tags such as `[BLANK_AUDIO]` are dropped. The "enter send, esc cancel" hint shows during your first three dictations, then the bar stays short.

### Speech models

| Model | Download | Notes |
|---|---|---|
| `tiny` | about 100 MB | fastest, least accurate |
| `base` | about 155 MB | the default: a good balance on a laptop CPU |
| `small` | about 360 MB | most accurate, slower on a CPU |

All three understand about 100 languages and detect the language by themselves. On a laptop CPU a phrase with `base` takes about a quarter of a second.

## Options

Give options by writing the plugin's entry in `~/.config/opencode/opencode.json` (on Windows `%USERPROFILE%\.config\opencode\opencode.json`) as an object:

```json
{
  "plugins": [
    {
      "package": "opencode-dictation",
      "options": { "key": "ctrl+r", "language": "en", "model": "small", "sendOnEnter": false }
    }
  ]
}
```

| Option | Default | What it does |
|---|---|---|
| `key` | `alt+v` | The shortcut that starts and stops dictation |
| `language` | detect | A Whisper language code (`en`, `de`, `no`, `es`, ...). Setting it is faster and more accurate than detection |
| `model` | `base` | The first model to use; `/dictate-model` changes it later |
| `sendOnEnter` | `true` | With `false`, Enter only stops dictating and the prompt waits for a second Enter |

## Good to know

- **Microphone permission.** On macOS, allow your terminal app to use the microphone (System Settings, Privacy & Security, Microphone). On Windows, allow desktop apps to use the microphone (Settings, Privacy & security, Microphone).
- **Hold-to-talk** (hold a key while speaking, like Claude Code's hold-Space) isn't possible yet: terminals tell programs when a key is pressed but not when it's released, so OpenCode plugins only get key presses. Dictation is press to start, press to stop, which also means your hands are free while you talk.
- **The CLI only.** This plugin is for the OpenCode terminal app. The desktop app isn't supported yet.

## How it works

`src/tui.tsx` puts the microphone into OpenCode's `prompt.footer.status` slot and registers the commands. Under `src/core/`:
- `audio.ts` reads the microphone through [PvRecorder](https://github.com/Picovoice/pvrecorder) in 512-sample frames at 16 kHz.
- `engine.ts` cuts the sound into phrases at each pause with Silero VAD and transcribes them with Whisper. Both run in sherpa-onnx's prebuilt native packages.
- `session.ts` keeps phrases in the order you said them, and re-transcribes the phrase you're still speaking every 0.6 seconds for the draft.
- `inline.ts` writes that draft into the prompt, greys it with an extmark, and swaps it for the final text. If you edit the draft by hand it becomes your text and is left alone.
- `models.ts` downloads models from Hugging Face.

## Develop

```bash
bun install
bun run typecheck
bun test                 # unit tests, plus a real transcription once the base model is downloaded
bun run e2e              # starts a real OpenCode in a pseudo-terminal and dictates a recorded clip
bun run mic-check        # listens on your microphone for 8 seconds and prints what it heard
```

To run your copy in OpenCode, add the folder to `~/.config/opencode/cli.json`: `{ "plugins": ["*", "/path/to/opencode-dictation"] }`.

The end-to-end test (`scripts/e2e.ts`) drives OpenCode through a pseudo-terminal. It clicks the microphone with real mouse events, presses alt+v, Esc and Enter, and reads the prompt box off the screen. The `OPENCODE_DICTATION_WAV` environment variable makes the plugin "hear" a WAV file instead of the microphone. `bun run e2e -- --send` also tests Enter-to-send, which sends one short message to your configured model.

## License

MIT
