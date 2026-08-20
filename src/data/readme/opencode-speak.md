# opencode-speak

[![npm version](https://img.shields.io/npm/v/opencode-speak)](https://www.npmjs.com/package/opencode-speak)
[![license](https://img.shields.io/npm/l/opencode-speak)](LICENSE)

Text-to-speech for AI coding assistants — hear responses spoken aloud using local TTS engines. Supports **OpenCode**, **Claude Code**, and **Codex CLI**. No cloud, no API keys, no subscriptions.

## Features

- **Multi-platform** — works with OpenCode, Claude Code, and Codex CLI
- **Two local TTS engines** — [Kokoro](https://github.com/yoav0gal/kokoro-cli) (82M params, 54 voices) and [Supertonic 3](https://github.com/MohamedAliRashad/speak-cli) (99M params, 10 voices)
- **100% offline** — no cloud APIs, no tokens, fully private
- **On-demand** — TTS is off by default, toggle on/off any time
- **No background processes** — models load per-request, zero idle RAM
- **Shared config** — settings sync across all platforms via `~/.config/opencode-speak/`
- **54+ voices** — multilingual: English, Japanese, Chinese, Hindi, French, Italian, Portuguese, Spanish, Korean

---

## TTS Engine Comparison

| | Kokoro 82M | Supertonic 3 | Voicebox |
|---|---|---|---|
| **Type** | TTS model (CLI) | TTS model (CLI) | Desktop app (wraps other models) |
| **Architecture** | Decoder-only, ONNX | Flow-matching, ONNX | Tauri + FastAPI |
| **Parameters** | 82M | 99M | N/A (uses Kokoro, Qwen3-TTS, etc.) |
| **Quality (MOS)** | 4.44-4.45 | 4.37 (5 steps) | Depends on backend |
| **Speed (RTF)** | 0.47-0.51 (1.8-2.1x RT) | 0.31 (3.2x RT) | Varies |
| **Voices** | 54 preset | 10 preset | Unlimited (voice cloning) |
| **Languages** | 9 | 31 | Depends on backend |
| **Voice cloning** | No | No | Yes (10-30s sample) |
| **RAM (idle)** | 0 (--service off) | 0 (--no-daemon) | ~1-2GB |
| **Model size** | 92MB (int8) | ~400MB | 1-6GB per backend |
| **GPU required** | No | No | Recommended |
| **License** | Apache 2.0 | OpenRAIL-M | Proprietary |
| **CLI** | `kokoro-cli` | `speak-cli` | N/A (HTTP API) |

**Our pick**: Kokoro for quality, Supertonic 3 for speed and language coverage. Both are CPU-only, zero-daemon, and load on-demand.

---

## Install

### Step 1: Install a TTS engine

You need at least one. Both are optional — the plugin auto-detects what's available.

```bash
# Kokoro (recommended) — 92MB model, 54 voices, CPU-optimized
uv tool install kokoro-cli
sudo apt install espeak-ng          # required on Linux
kokoro speak "hello" --play         # downloads model on first run

# Supertonic 3 — 400MB model, 10 voices, 31 languages
uv tool install speak-cli
speak "hello"                       # downloads model on first run
speak --stop                        # stop background daemon after first run
```

### Step 2: Install for your platform

<details open>
<summary><b>OpenCode</b></summary>

```bash
opencode plugin opencode-speak --global
```

Or with npm:

```bash
npm install opencode-speak
```

Add the `/tts` command to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-speak"],
  "command": {
    "tts": {
      "template": "$ARGUMENTS",
      "description": "TTS: on | off | kokoro | speak | voice NAME | voices | test | help"
    }
  }
}
```

> The `opencode plugin` command adds the plugin entry automatically. You only need to add the `command` block manually.

</details>

<details open>
<summary><b>Claude Code</b></summary>

Install from the marketplace — no cloning, no copying:

```
/plugin marketplace add ahmed0magdy/opencode-speak
/plugin install opencode-speak@opencode-speak
```

That's it. The `Stop` hook speaks the assistant's last message whenever TTS is
enabled, and `/opencode-speak:tts` controls it from inside the session:

```
/opencode-speak:tts on       # start speaking responses
/opencode-speak:tts off      # stop, and cut off anything mid-sentence
/opencode-speak:tts toggle   # flip between on and off
/opencode-speak:tts voice af_bella
```

If the install summary says `Run /reload-plugins to activate.`, run that.

</details>

<details>
<summary><b>Codex CLI</b></summary>

Clone the repo and copy the plugin:

```bash
git clone https://github.com/ahmed0magdy/opencode-speak.git ~/.local/share/opencode-speak
mkdir -p ~/.codex/plugins
cp -r ~/.local/share/opencode-speak/codex ~/.codex/plugins/opencode-speak
```

The `Stop` hook parses the transcript and speaks the last assistant message.

**Enable TTS:**
```bash
tts-config.sh set enabled true
```

</details>

### Step 3: Enable and test

```bash
# Enable TTS (shared across all platforms)
tts-config.sh set enabled true

# Test
tts-speak.sh --text "Hello, TTS is working!"
```

---

## Usage

### OpenCode (slash commands)

| Command | Description |
|---------|-------------|
| `/tts on` | Start speaking LLM responses |
| `/tts off` | Stop speaking, and cut off any speech in progress |
| `/tts toggle` | Flip between on and off |
| `/tts stop` | Stop current speech but stay enabled |
| `/tts kokoro` | Switch to Kokoro engine |
| `/tts speak` | Switch to Supertonic 3 engine |
| `/tts voice af_bella` | Change voice |
| `/tts voices` | List available voices for current engine |
| `/tts test` | Speak a test phrase |
| `/tts status` | Show current settings |
| `/tts help` | Show all commands |

### All platforms (config script)

```bash
# Enable/disable — `off` also stops speech already playing
tts-config.sh on
tts-config.sh off
tts-config.sh toggle
tts-config.sh stop        # stop current speech, stay enabled

# Switch engine
tts-config.sh set engine kokoro
tts-config.sh set engine speak

# Change voice
tts-config.sh set voice_kokoro af_bella
tts-config.sh set voice_speak emma

# Show status
tts-config.sh status
```

Settings live in `~/.config/opencode-speak/` (one file per key) and persist
across sessions and restarts — turning TTS on once keeps it on until you turn
it off. Set `OPENCODE_SPEAK_CONFIG_DIR` to point every component at a different
directory, which is how the self-test runs without touching your real settings:

```bash
bash bin/tts-selftest.sh          # full run with audio, ~40s
bash bin/tts-selftest.sh --quiet  # config and plumbing checks only
```

---

## Configuration (OpenCode only)

Pass options when using as an npm plugin:

```jsonc
{
  "plugin": [
    ["opencode-speak", {
      "defaultEngine": "kokoro",
      "defaultVoice": { "kokoro": "af_bella", "speak": "emma" },
      "maxChars": 3000,
      "autoStart": false
    }]
  ]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultEngine` | `"kokoro"` \| `"speak"` | First available | TTS engine on startup |
| `defaultVoice.kokoro` | `string` | `"af_heart"` | Default Kokoro voice |
| `defaultVoice.speak` | `string` | `"sara"` | Default Supertonic voice |
| `maxChars` | `number` | `2000` | Max characters to speak per response |
| `autoStart` | `boolean` | `false` | Enable TTS automatically on startup |

---

## Voices

### Kokoro — Female

`af_heart` `af_bella` `af_nova` `af_sky` `af_jessica` `af_nicole` `af_aoede` `af_kore` `af_alloy` `af_river` `af_sarah`

### Kokoro — All 54 voices

English (American): `af_*`, `am_*` | English (British): `bf_*`, `bm_*` | Spanish: `ef_*`, `em_*` | French: `ff_*` | Hindi: `hf_*`, `hm_*` | Italian: `if_*`, `im_*` | Japanese: `jf_*`, `jm_*` | Portuguese: `pf_*`, `pm_*` | Chinese: `zf_*`, `zm_*`

### Supertonic 3 — Female

`sara` `emma` `lily` `maya` `nora`

### Supertonic 3 — Male

`james` `daniel` `leo` `ryan` `noah`

---

## How It Works

### Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   OpenCode   │    │  Claude Code │    │  Codex CLI   │
│  (TypeScript │    │  (Stop hook  │    │  (Stop hook  │
│   plugin)    │    │   + stdin)   │    │ + transcript)│
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                                    │
                        ┌───────────▼───────────┐
                        │   bin/tts-speak.sh    │
                        │   (shared core)       │
                        └───────────┬───────────┘
                                    │
                        ┌───────────▼───────────┐
                        │ ~/.config/opencode-   │
                        │ speak/ (shared state) │
                        └───────────┬───────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼                             ▼
            ┌────────────────┐            ┌────────────────┐
            │  kokoro speak  │            │  speak --no-   │
            │  --service off │            │  daemon        │
            └────────────────┘            └────────────────┘
```

1. Each platform hooks into the "assistant finished responding" event
2. The hook extracts the last assistant message (method varies by platform)
3. Text is stripped of markdown formatting
4. Piped to the selected TTS engine CLI
5. Audio plays through system speakers

No background processes run while TTS is off. Models load on-demand and release memory after each synthesis.

---

## Comparison with Other Tools

| | opencode-speak | [narrate](https://github.com/felores/narrate) | [vox](https://github.com/punt-labs/vox) | [voice-bridge](https://github.com/Tomorrow-You/voice-bridge) | [aftertone](https://github.com/omarelkhal/aftertone) |
|---|---|---|---|---|---|
| **Cloud-free** | Yes | Optional | Optional | Optional | Yes |
| **API keys needed** | No | Depends | Depends | Optional | No |
| **OpenCode** | Yes | Yes | No | No | Soon |
| **Claude Code** | Yes | Yes | Yes | Yes | Yes |
| **Codex CLI** | Yes | Yes | No | No | Yes |
| **Local engines** | Kokoro, Supertonic 3 | Voicebox, Kokoro | System TTS | Kokoro, espeak-ng | Supertonic ONNX |
| **Cloud engines** | None | ElevenLabs, OpenAI, Gemini | ElevenLabs, Polly | ElevenLabs, edge-tts | None |
| **Background daemon** | No | Yes | Yes | No | Yes |
| **Idle RAM** | 0 MB | 200-450 MB | Varies | 0 MB | 450 MB |
| **Install** | One command | Script | Script | Plugin marketplace | Script |
| **Shared config** | Yes (all platforms) | No | No | No | No |

---

## WSL2 Audio Setup

If you're on WSL2, make sure WSLg is enabled:

1. Edit `C:\Users\<you>\.wslconfig`:
   ```ini
   [wsl2]
   guiApplications=true
   ```
2. Restart WSL: `wsl --shutdown` from PowerShell
3. Verify: `pactl info | grep "Server Name"` should show `PulseAudio (on PipeWire)`

---

## Uninstall

### OpenCode

```bash
# Remove from opencode.jsonc: delete "opencode-speak" from "plugin" array and "tts" command
# Or remove local file:
rm ~/.config/opencode/plugins/opencode-speak.ts
```

### Claude Code

```bash
rm -rf ~/.claude/plugins/opencode-speak
```

### Codex CLI

```bash
rm -rf ~/.codex/plugins/opencode-speak
```

### Shared (all platforms)

```bash
# Remove shared config
rm -rf ~/.config/opencode-speak

# Remove repo clone
rm -rf ~/.local/share/opencode-speak

# Remove TTS engines (optional)
uv tool uninstall kokoro-cli
uv tool uninstall speak-cli
rm -rf ~/.local/share/kokoro        # Kokoro models
rm -rf ~/.cache/supertonic3         # Supertonic 3 models
```

---

## Dependencies

- `jq` — JSON parsing for bash hooks (Claude Code, Codex): `sudo apt install jq`
- `kokoro-cli` and/or `speak-cli` — TTS engines (see Install above)
- `espeak-ng` — required for Kokoro on Linux: `sudo apt install espeak-ng`

---

## Contributing

Issues and pull requests welcome at [github.com/ahmed0magdy/opencode-speak](https://github.com/ahmed0magdy/opencode-speak).

## License

[MIT](LICENSE)
