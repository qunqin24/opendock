# opencode-voice-phonon

Local, offline voice prompts for [OpenCode](https://opencode.ai), powered by
[Fermion Research's Phonon-2.5](https://www.fermionresearch.com/models/phonon-2-5/).

- **Desktop:** a **Voice** pill above the composer. Click it, press
  `Mod+Shift+Space`, or run `/voice`; the transcript is inserted into the
  composer for review.
- **TUI:** a microphone in the prompt footer. Press `Ctrl+Space`, click it, or
  run `/voice`; review and submit, or send immediately.
- **Local:** a Rust sidecar with vendored Phonon-2.5 C inference. No Python, no
  model server. The 183 MB model is downloaded once and checked against a
  pinned SHA-256. Inference is CPU-only in 0.1.0; GPU backends are future work.

## Install

The npm package is `opencode-voice-phonon`:

```bash
opencode plugin add opencode-voice-phonon
```

Restart OpenCode. Desktop reads the global config, which `plugin add` writes.
If npm returns 404, the package is not published yet; build from source below.

### From source

```bash
git clone https://github.com/shaderko/opencode-voice-phonon.git
cd opencode-voice-phonon
npm install
npm run build:gui
npm run build:native
npm run package:native
```

Add the checkout to the **global** `opencode.json(c)`:

```jsonc
{
  "plugins": ["file:///absolute/path/to/opencode-voice-phonon"]
}
```

Desktop needs the global config. The first recording downloads the model to the
per-user cache.

## Configuration

| Option | Part | Default | Description |
| --- | --- | --- | --- |
| `keybind` | TUI | `ctrl+space` | TUI toggle keybind. |
| `review` | TUI | `true` | Show the editable review dialog before submitting. |
| `showPartial` | TUI | `true` | Show the live partial transcript in the footer. |
| `modelDir` | both | unset | Directory containing `weights.bin`, `weights.json`, `tokens.txt`. |

Desktop uses `Mod+Shift+Space`; the command palette and `/voice` work on both
surfaces.

## Requirements

- OpenCode 2.2.1 or newer.
- Windows x64 with AVX2, macOS 13+ (arm64 or x64), or Linux x64/arm64 with ALSA.
- A microphone. On macOS, grant access to the terminal or OpenCode Desktop.
- ~300 MB disk for the cached model.

## Privacy

Audio is captured in memory and transcribed locally. The only network request
is the one-time model download from Hugging Face. Desktop inserts the text into
your composer; the TUI submits it to your local OpenCode server. There is no
telemetry.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build:gui
cargo test --manifest-path native/Cargo.toml
npm run build:native
```

See [`docs/architecture.md`](docs/architecture.md),
[`docs/development.md`](docs/development.md),
[`docs/troubleshooting.md`](docs/troubleshooting.md), and
[`docs/security.md`](docs/security.md).

## License

Plugin code is MIT. Phonon-2.5 weights are CC-BY-4.0; the vendored
`phonon-2.5-c` engine is MIT. See [`NOTICE`](NOTICE).
