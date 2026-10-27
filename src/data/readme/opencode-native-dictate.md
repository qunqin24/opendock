# OpenCode Native Dictate

Native Dictate adds local voice dictation to the OpenCode v2 terminal interface. It records through macOS, transcribes on your Mac with NVIDIA Parakeet TDT 0.6B, and inserts the transcript at the prompt cursor. Audio is not sent to a service, and the prompt is never submitted automatically.

It is built for Apple Silicon Macs and was primarily exercised in Ghostty. The current compatibility target is OpenCode 2.1.4; other OpenCode releases have not yet been validated.

## Requirements

- Apple Silicon Mac running macOS
- OpenCode 2.1.4 with CLI/TUI plugin support
- Node.js 20 or newer with npm, for the explicit setup and diagnostic commands
- `uv` and Xcode Command Line Tools (`swiftc`) for the one-time local setup
- At least 3.5 GB free for the default Parakeet model and runtime; setup downloads about 2.51 GB of model files
- Microphone permission for the terminal app running OpenCode

Qwen3-ASR is an optional alternative. Its pinned 0.6B 8-bit model is about 1.01 GB; allow at least 1.8 GB free during setup.

## Install from npm

Native Dictate is terminal-only: it captures audio and writes into the active prompt. Install the pinned npm release with OpenCode's plugin command:

```sh
opencode plugin add opencode-native-dictate@0.2.0
```

OpenCode registers CLI-only plugins in the global v2 `cli.json` (`~/.config/opencode/cli.json`, or `$XDG_CONFIG_HOME/opencode/cli.json`) and manages the npm package cache. Adding the plugin does not install its recorder or speech runtime; this required one-time setup builds and installs them, then downloads the selected model after confirmation:

```sh
npx --yes --package opencode-native-dictate@0.2.0 native-dictate setup
```

Setup shows download sizes and asks before downloading. To choose Qwen instead, use:

```sh
npx --yes --package opencode-native-dictate@0.2.0 native-dictate setup --backend qwen3-asr
```

Then set the plugin's backend in `cli.json` to match the downloaded model:

```json
{
  "plugins": [
    {
      "package": "opencode-native-dictate@0.2.0",
      "options": { "backend": "qwen3-asr" }
    }
  ]
}
```

Keep your other CLI settings and plugin entries. The same `options` object accepts `binding` for a different shortcut and `deviceUID` for a chosen microphone.

The `npx --yes` flag accepts npm's prompt to fetch the small CLI package; Native Dictate still asks separately before downloading the speech model and runtime.

Restart OpenCode if it is already running. The generated recorder and Python environment live in `~/Library/Application Support/OpenCode Native Dictate`; model files are kept there too. Setup can be rerun after plugin updates. It reuses verified model files.

Check the installation without recording or downloading anything:

```sh
npx --yes --package opencode-native-dictate@0.2.0 native-dictate doctor
```

## Install from a local checkout

For development or a locally modified copy, clone the repository and run:

```sh
npm ci
npm run setup
npm run configure:add
npm run doctor
```

This registers the checkout in the OpenCode v2 `cli.json`. It preserves JSONC comments and unrelated settings. To choose Qwen, pass `--backend qwen3-asr` to both `npm run setup` and `npm run configure:add`. To select a different shortcut, pass `--binding '<leader>v'` to `npm run configure:add`; the default is `<leader>d` (Ctrl+X, then D with the default leader). A microphone can be selected by its stable UID from the doctor output:

```sh
npm run configure:add -- --device-uid 'YOUR_CORE_AUDIO_DEVICE_UID'
```

Remove the npm registration with `opencode plugin remove opencode-native-dictate@0.2.0`. Remove a local-checkout registration with `npm run configure:remove`. Both leave the runtime and model files available for a future install.

## Use

Focus the normal editable prompt and press **Ctrl+X**, then **D** to start dictation. You can also open the command palette with **Ctrl+P** and choose **Start local dictation**. `/dictate-start` is available when slash completion is active at the beginning of the prompt.

Speak, then press **Enter** to stop and transcribe. Press **Escape** to cancel and discard the recording. The text is left in the prompt for review; it is never submitted automatically. Dictation uses OpenCode's normal editor undo history.

The footer stays quiet while idle so OpenCode's path and branch details remain visible. During dictation it shows a recording indicator with elapsed time and audio level, then a short transcription indicator. Errors appear as brief notifications. Dictation can run while OpenCode is responding: it inserts the transcript into the editable prompt and never submits it. Starting is refused outside the normal editable prompt and when text is selected. Typing and paste are consumed while a dictation session is active. Focus, route, cursor or draft changes cancel the session so a late result cannot land in a different prompt.

## Backends and privacy

Parakeet is the default. Qwen3-ASR can be selected explicitly during setup. Both use the same pinned local MLX Audio runtime and run with model downloads disabled. Missing model assets are errors; the plugin does not download at runtime, switch engines or rewrite the transcript with an LLM.

The npm package includes code and setup files, not model weights. Setup downloads a revision-pinned model from Hugging Face after confirmation. Model licenses differ from the project license; see [docs/model-licenses.md](docs/model-licenses.md). See [docs/transcription.md](docs/transcription.md) for model revisions and limits, [docs/microphone.md](docs/microphone.md) for permission and device behavior, and [docs/manual-testing.md](docs/manual-testing.md) for the Ghostty acceptance steps.

## Development and checks

```sh
npm ci
npm run check
npm test
npm pack --dry-run
```

`npm test` runs the Swift, Python and Node test suites. `npm pack --dry-run` builds the JavaScript entrypoint and previews the files that would enter the npm package without publishing it.

An npm publish also runs the type check and full test suite automatically.

The package is still pre-1.0.0. Release checks, package contents and version pinning are documented in [docs/releasing.md](docs/releasing.md).

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Validation limits

Automated Swift, Python and Node suites pass. A user confirmed basic live dictation in Ghostty on a Mac after accepting the microphone permission prompt, and the local checkout loaded in OpenCode 2.1.4. The published npm v0.1.0 package installed through OpenCode's plugin command in an isolated profile and added its pinned entry to `cli.json`. The documented `npx` doctor command also ran from a separate temporary consumer and reported the helper/runtime setup checks without recording or downloading files. An earlier local-tarball setup installed the pinned runtime, built the native recorder and downloaded the model; doctor passed all checks except audio input visibility. A headless environment could not run model inference because it has no Metal device. Transcription with networking disabled, device-failure handling, and the full editor and lifecycle acceptance matrix remain unverified. See [docs/manual-testing.md](docs/manual-testing.md) and [docs/acceptance-results.md](docs/acceptance-results.md) for the remaining checks.

## License

The project code is licensed under the MIT License. Downloaded speech models have separate licenses; see [docs/model-licenses.md](docs/model-licenses.md).
