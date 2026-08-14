# @afterrealism/opencode-voice

Local, private voice dictation for [OpenCode](https://opencode.ai) on Linux.
It records from your microphone with ALSA, transcribes on-device with
[whisper.cpp](https://github.com/ggml-org/whisper.cpp), optionally cleans up the
transcript with a loopback [Ollama](https://ollama.com) model, and appends the
result to your OpenCode prompt. It **never submits** the prompt for you and it
never sends audio or transcripts to the cloud.

## Features

- Push-to-toggle dictation from the OpenCode TUI (`Ctrl+O` by default).
- `/voice` and `/voice-cancel` slash commands.
- On-device transcription with whisper.cpp (`whisper-cli`).
- Optional local transcript cleanup via a loopback Ollama endpoint.
- Raw-transcript fallback when Ollama is unavailable or returns bad output.
- Appends to the prompt only — you review and submit.
- No runtime dependencies, no telemetry, no cloud calls, no install hooks.
- `opencode-voice doctor` prerequisite checker that changes nothing.

## Requirements

- **Linux with ALSA.** This version supports Linux only; recording uses
  `arecord` from `alsa-utils`. macOS and Windows are not supported.
- **Node.js >= 22** (OpenCode already provides a compatible runtime; Node is
  only needed directly for the `opencode-voice doctor` CLI).
- **whisper.cpp** providing the `whisper-cli` binary on your `PATH`.
- **A Whisper model file** (see below); the large v3 Q5 model is recommended.
- **Ollama** (optional) running on loopback for transcript cleanup.

## Install

Install the plugin from npm:

```bash
npm install -g @afterrealism/opencode-voice
```

Installing globally puts the `opencode-voice` doctor CLI on your `PATH`. You may
also let OpenCode manage the plugin from `tui.json` (see
[Configure OpenCode](#configure-opencode)); OpenCode installs the package into
its own plugin store. The package ships no install, build, or postinstall
scripts and pulls in no runtime dependencies.

Install the ALSA recording utility for your distribution:

```bash
# Debian / Ubuntu
sudo apt-get install -y alsa-utils

# Fedora
sudo dnf install -y alsa-utils
```

`arecord` (from `alsa-utils`) must be on your `PATH`.

## Install whisper.cpp

This plugin calls the `whisper-cli` binary from whisper.cpp. Your distribution
may or may not package it, so build it from source. These instructions target
whisper.cpp **v1.9.1**.

```bash
git clone --branch v1.9.1 --depth 1 https://github.com/ggml-org/whisper.cpp
cd whisper.cpp
```

Pick the CPU build or the NVIDIA CUDA build below, then put the resulting
`build/bin/whisper-cli` on your `PATH` (for example, copy or symlink it into a
directory such as `~/.local/bin`).

### CPU

A CPU build works everywhere and needs no GPU drivers:

```bash
cmake -B build
cmake --build build -j --config Release
# result: build/bin/whisper-cli
```

### NVIDIA CUDA

A CUDA build is faster if you have an NVIDIA GPU and the CUDA toolkit installed.
Enable CUDA and let the toolchain detect your GPU architecture rather than
hardcoding one:

```bash
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=native
cmake --build build -j --config Release
# result: build/bin/whisper-cli
```

`native` asks the CUDA compiler to target the architecture of the GPU in the
build machine. If your CUDA toolkit is too old to support `native`, look up your
GPU's compute capability (for example, `89` for an RTX 40-series Ada card) and
pass it explicitly, e.g. `-DCMAKE_CUDA_ARCHITECTURES=89`. Do not copy another
machine's architecture number blindly — it must match your card.

## Download the Whisper model

The model file is user-supplied and referenced by an **absolute** path. The
recommended model is large v3 Q5 (`ggml-large-v3-q5_0.bin`). Download it from
the whisper.cpp model repository on Hugging Face:

```bash
mkdir -p ~/.local/share/whisper-models
curl -L -o ~/.local/share/whisper-models/ggml-large-v3-q5_0.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin
```

Confirm the file is present and readable — the plugin and the doctor both check
readability at the configured absolute path:

```bash
test -r ~/.local/share/whisper-models/ggml-large-v3-q5_0.bin && echo readable
```

Smaller models (for example `ggml-base.en.bin`) also work and are faster but
less accurate; point `whisperModelPath` at whichever `.bin` you downloaded.

## Configure Ollama

Ollama is optional. When it is running on loopback, the raw transcript is passed
through a local model for light cleanup (punctuation, capitalization, obvious
recognition fixes). Install Ollama from <https://ollama.com>, then pull the
default model:

```bash
ollama pull qwen2.5:7b
```

Ollama serves an OpenAI-compatible API on `http://127.0.0.1:11434` by default,
which matches the plugin's default endpoint. If Ollama is not running, dictation
still works and the plugin uses the **raw transcript** instead.

## Run the doctor

`opencode-voice doctor` is a read-only prerequisite check. It records nothing,
calls no cloud endpoint, and installs, downloads, or starts nothing.

```bash
opencode-voice doctor --model /absolute/path/to/ggml-large-v3-q5_0.bin
```

It checks, in order: Linux platform, `arecord`, `whisper-cli`, the model file's
readability, the OpenCode version (if `opencode` is on `PATH`), and Ollama
reachability plus the configured model.

Exit semantics:

- Exit code **0** when no required check fails.
- Exit code **1** when a required check fails (wrong platform, missing
  `arecord`/`whisper-cli`, or an unreadable model), or when the arguments are
  invalid.
- A missing OpenCode binary and an unreachable or unconfigured Ollama are
  **warnings**, not failures: the plugin still transcribes, and an Ollama
  warning simply means normalization is skipped and the **raw transcript** is
  used.

Add `--json` to emit the machine-readable result. Run `opencode-voice --help`
for all flags (`--model`, `--ollama-model`, `--ollama-endpoint`, `--language`,
`--shortcut`, `--json`).

## Configure OpenCode

Register the plugin in your OpenCode TUI config at
`~/.config/opencode/tui.json`. Use the npm tuple form — a `[name, options]`
pair — with an **absolute** model path:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "@afterrealism/opencode-voice",
      {
        "whisperModelPath": "/home/you/.local/share/whisper-models/ggml-large-v3-q5_0.bin"
      }
    ]
  ]
}
```

**Restart OpenCode** after editing `tui.json` so it loads the plugin. On a
successful load the plugin registers its commands and the toggle shortcut; on
invalid options it shows one error toast and stays inactive.

## Usage

- **Toggle recording:** press `Ctrl+O` (or your configured `shortcut`), or run
  `/voice`. Press again to stop; transcription and optional cleanup run, then
  the text is appended to your prompt.
- **Cancel:** run `/voice-cancel` to stop and discard the current dictation
  without inserting anything.
- **Review and submit:** the plugin **never submits** the prompt. It only
  appends text; you press Enter yourself.
- Recording stops automatically after 120 seconds.

Status toasts report each phase (Recording, Transcribing, Normalizing,
Transcript added). If normalization fails, you get a warning and the **raw
transcript** is inserted instead — your words are never lost.

## Configuration

Options go in the second element of the plugin tuple in `tui.json`.

| Option            | Required | Default                                      | Notes |
| ----------------- | -------- | -------------------------------------------- | ----- |
| `whisperModelPath`| yes      | —                                            | Absolute path to a whisper.cpp `.bin` model. |
| `ollamaModel`     | no       | `qwen2.5:7b`                                 | Local Ollama model used for cleanup. |
| `ollamaEndpoint`  | no       | `http://127.0.0.1:11434/v1/chat/completions` | Must be loopback (`127.0.0.1`, `localhost`, or `::1`), HTTP/HTTPS, no credentials/query/fragment, path exactly `/v1/chat/completions`. |
| `language`        | no       | `en`                                         | `auto` or a 2–3 letter lowercase code passed to whisper.cpp. |
| `shortcut`        | no       | `ctrl+o`                                     | OpenCode key expression for the toggle. |

Unknown options are rejected to catch typos.

Notes:

- **Normalization is best-effort.** If Ollama is unreachable, times out, or
  returns malformed output, the plugin falls back to the raw transcript and
  **no prompt is submitted**.
- **Shortcut conflicts.** `ctrl+o` may collide with an existing OpenCode
  keybinding or a terminal/emulator binding. If the toggle does nothing, pick a
  free key via `shortcut` and avoid keys your terminal already intercepts.
- **Cloud endpoints are rejected.** Only loopback Ollama hosts are accepted;
  there is no API-key or remote-endpoint support by design.

## Privacy and security

- Audio and transcripts stay on your machine. Nothing is sent to any cloud
  service. The only network call is to your configured loopback Ollama endpoint.
- No telemetry, analytics, or crash reporting.
- Recordings are written to a unique, mode-`0700` temporary directory and
  deleted after the pipeline finishes or on cancel/shutdown.
- Child processes (`arecord`, `whisper-cli`) are spawned with argument arrays,
  never a shell string, and only the exact spawned process is ever signalled —
  no process-name matching or `pkill`.
- Logs contain state names and error categories only — never transcript text,
  model responses, audio, or secrets.
- Output buffers and operation timeouts are bounded so a runaway process cannot
  exhaust memory or hang the plugin.

## Troubleshooting

- **`/voice` or the shortcut does nothing.** Confirm OpenCode was restarted
  after editing `tui.json`, then check for a shortcut conflict and set a
  different `shortcut`.
- **"Voice unavailable" preflight error.** `arecord` or `whisper-cli` is not on
  `PATH`, or the model is not readable. Run `opencode-voice doctor --model ...`
  to see which check fails.
- **No speech detected.** Recording was silent or too quiet; check your ALSA
  input device and microphone levels.
- **Transcription failed.** Verify the model path is correct and the file is a
  valid whisper.cpp `.bin`, and that your `whisper-cli` version can read it.
- **Cleanup unavailable; using the raw transcript.** Ollama is down or the model
  is not pulled. Start Ollama and run `ollama pull qwen2.5:7b`, or ignore it and
  keep using raw transcripts.
- **Plugin inactive after config change.** An option is invalid (for example a
  relative `whisperModelPath` or a non-loopback endpoint). The error toast names
  the offending option.

## Upgrade

```bash
npm install -g @afterrealism/opencode-voice@latest
```

If OpenCode manages the plugin from `tui.json`, update the version constraint
there (or let it re-resolve) and restart OpenCode. Review the changelog for any
option changes before upgrading across a major version.

## Uninstall

```bash
npm uninstall -g @afterrealism/opencode-voice
```

Then remove the plugin tuple from `~/.config/opencode/tui.json` and restart
OpenCode. Whisper models, whisper.cpp, and Ollama are separate installs; remove
them yourself if you no longer need them. The plugin leaves no temporary audio
behind — recordings are deleted after each use.

## Development

```bash
git clone https://github.com/afterrealism/opencode-voice
cd opencode-voice
npm install --ignore-scripts
npm test
npm run build
npm pack --dry-run
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow and
[SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE) © 2026 After Realism
