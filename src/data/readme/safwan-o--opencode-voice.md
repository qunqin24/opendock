<p align="center">
  <a href="https://github.com/safwan-o/opencode-voice">
    <picture>
      <source srcset="assets/opencode-voice-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="assets/opencode-voice-light.svg" media="(prefers-color-scheme: light)">
      <img src="assets/opencode-voice-light.svg" alt="opencode voice logo">
    </picture>
  </a>
</p>
<p align="center">Local speech-to-text for the OpenCode TUI.</p>
<p align="center">
  <a href="https://github.com/safwan-o/opencode-voice/actions/workflows/release-check.yml"><img alt="CI" src="https://github.com/safwan-o/opencode-voice/actions/workflows/release-check.yml/badge.svg" /></a>
  <img alt="opencode" src="https://img.shields.io/badge/OpenCode-V2_TUI_plugin-black?style=flat-square" />
  <img alt="status" src="https://img.shields.io/badge/status-mvp-orange?style=flat-square" />
  <a href="https://www.npmjs.com/package/@safwan-o/opencode-voice"><img alt="npm version" src="https://img.shields.io/npm/v/@safwan-o/opencode-voice?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@safwan-o/opencode-voice"><img alt="npm downloads (monthly)" src="https://img.shields.io/npm/dm/@safwan-o/opencode-voice?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@safwan-o/opencode-voice"><img alt="npm downloads (total)" src="https://img.shields.io/npm/dt/@safwan-o/opencode-voice?style=flat-square" /></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
  <img alt="stt" src="https://img.shields.io/badge/STT-local_whisper.cpp-purple?style=flat-square" />
</p>

> [!IMPORTANT]
> This is an **OpenCode V2 TUI plugin** (`Plugin.define`, `./tui` entry). It does
> not work on OpenCode V1, and it must **not** be installed with
> `opencode plugin add` (that registers *server* plugins, which this package is
> not). Follow the `cli.json` install below.

## Demo

<video src="https://github.com/user-attachments/assets/2edc713c-7a5e-46b7-8e66-3caeab4ab396" width="100%" controls></video>


| Slash commands | Voice settings | Model picker |
|---|---|---|
| ![slash commands](https://github.com/safwan-o/opencode-voice/releases/download/v0.4.0/voice-slash-commands.png) | ![voice settings](https://github.com/safwan-o/opencode-voice/releases/download/v0.4.0/voice-settings.png) | ![model picker](https://github.com/safwan-o/opencode-voice/releases/download/v0.4.0/voice-model-picker.png) |
| `/voice`, `/voice-submit`, `/voice-stop`, `/voice-settings` | Record key, transcription, audio & system | 87 local models with size and engine at a glance |

<p align="center">
  <a href="README.md">English</a> |
  <a href="docs/README.ru.md">Русский</a> |
  <a href="docs/README.zh.md">简体中文</a> |
  <a href="docs/README.es.md">Español</a>
</p>

---

## Install

OpenCode 2.x loads TUI plugins from `cli.json` (`~/.config/opencode/cli.json`):

```json
{
  "plugins": ["@safwan-o/opencode-voice"]
}
```

Then fully quit the TUI and reopen it twice: the first boot downloads and
installs the package in the background, the second boot runs it. (`/restart`
only restarts the session — plugin code loads at TUI startup.)

> [!NOTE]
> `tui.json` is legacy and ignored by OpenCode 2.x — do not list the plugin
> there. Do not use `opencode plugin add` either: that registers server-side
> plugins and this package is CLI-only, so it would report a load failure.

On first launch, choose a model. The plugin downloads its required local runtime and model weights automatically. Audio and transcription stay on your machine.

Optional CLI installer. It runs the same OpenCode plugin install command and pre-downloads the managed engine:

```bash
npx @safwan-o/opencode-voice install
```

Update an installed plugin to the latest published version, then restart OpenCode:

```bash
npx @safwan-o/opencode-voice update
```

Add `--global` if the plugin was installed in OpenCode's global configuration.

Do not clone the repo unless you want to develop the plugin.

> [!TIP]
> First launch opens a model picker. Choose a local model, let it download, then use `ctrl+space` to dictate (change it in `/voice-settings`). With auto-submit off, transcriptions land in your clipboard for pasting.

## What It Installs

The plugin manages the STT engine and models:

- downloads `whisper.cpp` or the Rust `transcribe-cpp` sidecar from the opencode-voice GitHub Release registry
- stores each runtime in `~/.cache/opencode-voice/engines/<engine>/<platform>-<arch>/`
- downloads the selected model on first setup

Manual runtime installation is optional. Existing `whisper-cli` or `opencode-voice-transcribe` binaries can also be imported through the CLI.

Check your machine:

```bash
npx @safwan-o/opencode-voice doctor
```

Install or inspect a managed runtime without opening OpenCode:

```bash
npx @safwan-o/opencode-voice engine install transcribe-cpp
npx @safwan-o/opencode-voice engine status transcribe-cpp
```

## Use It

Commands:

- `/voice` - toggle recording; transcription goes to the clipboard, or submits when auto-submit is on
- `/voice-submit` - toggle recording and submit after transcription, even with auto-submit off
- `/voice-stop` - cancel active recording or transcription
- `/voice-settings` - open model, hotkey, microphone, and diagnostics settings

Default hotkey:

```txt
ctrl+space -> start recording
ctrl+space -> stop, transcribe, and copy (or submit)
```

In `/voice-settings` -> **Recording**, choose one **Record key**. Toggle recording starts on the first press and transcribes on the second. (`ctrl+r` is intentionally not the default: OpenCode binds it to session rename.) Hold-to-talk is shown as unavailable until OpenCode exposes terminal key-release events to TUI plugins.

**Delivery:** with auto-submit off (default), the transcription is copied to the OS clipboard (`wl-copy` / `pbcopy` / `clip` / `xclip` / `xsel`, first available wins) and a toast confirms — paste it into the main textbox with Ctrl+V, where images can also be attached. There is no composer-append API in OpenCode V2, so the clipboard is the edit path. With auto-submit on (or via `/voice-submit`), the text is sent as a user message immediately.

Settings also let you select a microphone, language, model, download location, voice cleanup, and auto-submit.

## Voice cleanup

Recording settings include an optional algorithmic cleanup chain (on by default):

```
highpass=f=120, adeclick, dynaudnorm, alimiter
```

It strips rumble/hum, mic pops, and levels volume before transcription, for every recorder backend. Disable it per-machine with the **Voice cleanup** toggle; tune the **Rumble filter** cutoff (40–500 Hz, default 120 Hz) if a specific room needs it. Details and measurements: `docs/voice-cleanup.md`.

## Models

The picker includes 19 `whisper.cpp` GGML choices and 68 ASR GGUF models from Handy's `transcribe.cpp` catalog. Pick one model at a time; only that model is downloaded.

Useful `whisper.cpp` starting points:

| Model                | Size   | Notes                         |
| -------------------- | ------ | ----------------------------- |
| Whisper Tiny Q5_1    | 31 MB  | fastest, lowest accuracy      |
| Whisper Base Q5_1    | 57 MB  | small multilingual option     |
| Whisper Small Q5_1   | 181 MB | compact Small                 |
| Whisper Small        | 465 MB | default, multilingual         |
| Whisper Medium Q4_1  | 469 MB | Handy-compatible quantization |
| Whisper Medium Q5_0  | 514 MB | higher-quality multilingual   |
| Whisper Turbo Q5_0   | 547 MB | compact large-v3 Turbo        |
| Whisper Turbo        | 1.5 GB | large, faster than full large |
| Whisper Large Q5_0   | 1.0 GB | accurate, slower              |

The managed `transcribe-cpp` sidecar provides these Handy catalog families. Diarization and VAD assets are excluded because they do not produce text through the transcription runtime.

| Model | Size | Notes |
| --- | --- | --- |
| Parakeet, Nemotron, GigaAM | varies | English, multilingual, and Russian models |
| Moonshine | varies | English plus language-specific variants |
| Canary, Cohere, SenseVoice, Fun-ASR | varies | multilingual and specialized recognizers |
| Whisper, Breeze, Voxtral, Qwen, Granite | varies | general-purpose and language-specialized models |

Model downloads support resume, retry, progress, and SHA256 verification. Sidecar catalog URLs are pinned to an upstream Hugging Face revision and their LFS SHA-256 digest, so a model cannot be activated until its expected artifact verifies.

> [!NOTE]
> Large models can require multiple gigabytes of disk space and significant memory. Start with Whisper Small, GigaAM V3 for Russian, or Parakeet for a fast GGUF option.

## Troubleshooting

Run diagnostics first:

```bash
npx @safwan-o/opencode-voice doctor
```

- `Engine not found in registry: transcribe-cpp`: the installed plugin expects a release registry that does not yet include the sidecar. Update the plugin after its matching Engine Release is published, or locally import a built sidecar with `opencode-voice engine import transcribe-cpp <path>`.
- `Could not start recorder` on Windows: open `/voice-settings` and select the enumerated microphone rather than relying on the system default. The error includes the exact `ffmpeg` command and stderr for diagnosis.
- Hold-to-talk is unavailable: current OpenCode releases do not expose terminal key-release events to TUI plugins. Use the default `ctrl+space` toggle mode instead.
- `Plugin failed` in the TUI: you installed a V1-shaped package or used `opencode plugin add` (server-side). This package is CLI-only — load it from `cli.json` as shown above, never from `tui.json` or `opencode.json` `plugins`.
- Empty transcriptions on noisy mics: enable **Voice cleanup** in Recording settings (on by default); if a specific room defeats it, raise the Rumble filter cutoff.

## Platform Status

| Platform | Status |
| -------- | ------ |
| Linux    | one-command engine/model install; recording uses `arecord`, `ffmpeg`, or `sox` |
| macOS    | one-command engine/model install; recording uses `ffmpeg` AVFoundation until the native recorder sidecar ships |
| Windows  | one-command engine/model/recorder install; recording uses DirectShow through a managed cached `ffmpeg.exe`, with system/bundled ffmpeg fallback |

## Architecture

This is an OpenCode V2 CLI plugin (`Plugin.define({ id, setup })` from
`@opencode/plugin/tui`, `./tui` entry). Requires OpenCode 2.x (`engines.opencode`). The V1 `{ id, tui() }` entry in
`index.js` is retained on a best-effort basis for old hosts — untested, unsupported.

- V2 entry: `src/tui.ts` (setup, keymap layer, delivery)
- `src/voice.ts` — record/transcribe controller with single-flight phase lock
- `src/dialogs.ts` — settings pickers on promise dialog APIs
- `src/settings.ts` — normalization, defaults, legacy hotkey migration
- `src/clipboard.ts` — OS clipboard writers (wl-copy/pbcopy/clip/xclip/xsel)
- `src/enhance.ts` — voice-cleanup chain builder (canonical logic in `lib/enhance.js`)
- `src/formatters.ts`, `src/languages.ts` — display helpers, Whisper language list
- runtime settings live in OpenCode TUI plugin storage (`ctx.storage.store`)

Files:

- `src/tui.ts` - V2 plugin entrypoint, commands, keymap layer, delivery
- `index.js` - legacy V1 entrypoint (kept for compatibility, not the load path on V2)
- `lib/models.js` - model registry, cache paths, default settings
- `lib/download.js` - resumable model download and SHA256 verification
- `lib/engine.js` - recorder selection, managed Windows recorder install, runtime-routed transcription, pre-transcribe cleanup
- `lib/enhance.js` - cleanup filter chain builder + cutoff normalization
- `lib/engines.js` - managed native engine download, status, import, and removal
- `lib/handy-model-catalog.js` - pinned Handy GGUF model metadata
- `test/` - hermetic unit tests plus binary-gated fixture/integration tests (`test/fixtures/` is generated, gitignored)
- `docs/` - design notes and measurements (`voice-cleanup.md`, `v2-inventory.md`, loader notes)
- `bin/opencode-voice.js` - install wrapper and diagnostics CLI
- `sidecar/` - Rust `transcribe-cpp` command-line runtime for GGUF models

Voice input needs native audio and STT binaries. The JS plugin manages OpenCode UI, settings, model downloads, and delivery (clipboard or direct submit). The managed Rust sidecar provides the `transcribe.cpp` runtime for supported GGUF model families.

## Roadmap

- Rust recorder sidecar with `cpal` and VAD
- streaming transcription for sidecar models
- Windows recorder stability and UX polish

## Development

Run checks:

```bash
npm run check
npm pack --dry-run
cargo check --manifest-path sidecar/Cargo.toml
```

The JavaScript plugin has no frontend build step. The optional GGUF runtime is a Rust sidecar built by the Engine Release workflow.

Local development cannot point the v2.0.1 TUI at a checkout (file specs are
silently ignored by its loader) — verify through the hermetic test suite and
`npm pack --dry-run` instead:

```bash
git clone https://github.com/safwan-o/opencode-voice.git opencode-voice
cd opencode-voice
npm install
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Project Status

This is an independent OpenCode plugin. It is not built by the OpenCode team and is not affiliated with OpenCode.

## Credits

- OpenCode wordmark SVG adapted from the public [OpenCode repository](https://github.com/anomalyco/opencode). The `voice` mark was added for this plugin.
- [Handy](https://github.com/cjpais/Handy) inspired the local-first model experience and supplies the curated `transcribe.cpp` model catalog this plugin pins and verifies.
- Local Whisper transcription uses [`whisper.cpp`](https://github.com/ggml-org/whisper.cpp).
- Handy GGUF transcription runs through the Rust [`transcribe-cpp`](https://crates.io/crates/transcribe-cpp) binding and its upstream `transcribe.cpp` runtime.
- Recording and conversion rely on [FFmpeg](https://ffmpeg.org/) where the platform recorder requires it; managed distribution uses [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static).
- Model artifacts are hosted by [Hugging Face](https://huggingface.co/). Individual model creators and licenses remain those declared by each upstream model repository; their pinned source URLs are retained in `lib/handy-model-catalog.js`.

---

**OpenCode** [Website](https://opencode.ai) | [Docs](https://opencode.ai/docs) | [Discord](https://opencode.ai/discord)
