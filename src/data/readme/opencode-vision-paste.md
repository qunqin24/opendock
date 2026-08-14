<div align="center">

# opencode-vision-paste

**OpenCode plugin: intercept pasted images → local VL API analysis → replace with text**

[![GitHub Release](https://img.shields.io/github/v/release/wsaaaqqq/opencode-vision-paste?style=flat-square&logo=github&labelColor=black&color=369eff)](https://github.com/wsaaaqqq/opencode-vision-paste/releases)
[![npm version](https://img.shields.io/npm/v/opencode-vision-paste?style=flat-square&logo=npm&labelColor=black&color=cb3837)](https://www.npmjs.com/package/opencode-vision-paste)
[![CI](https://img.shields.io/github/actions/workflow/status/wsaaaqqq/opencode-vision-paste/ci.yml?style=flat-square&logo=github&labelColor=black&color=8ae8ff)](https://github.com/wsaaaqqq/opencode-vision-paste/actions)
[![License](https://img.shields.io/github/license/wsaaaqqq/opencode-vision-paste?style=flat-square&labelColor=black&color=white)](LICENSE)

[English](README.md) | [简体中文](readme/zh-CN.md) | [繁體中文](readme/zh-TW.md) | [日本語](readme/ja.md) | [한국어](readme/ko.md) | [Español](readme/es.md) | [Français](readme/fr.md) | [Deutsch](readme/de.md) | [Русский](readme/ru.md) | [Português](readme/pt.md)

</div>

You paste an image into your OpenCode session. The LLM can't see it. The plugin can.

opencode-vision-paste intercepts pasted images, sends them to a local VL API (e.g., Qwen3VL running via llama.cpp), and replaces the image with a detailed text description — seamlessly, before the LLM ever sees the message.

No cloud dependencies. No API keys required. Your images stay local.

---

## Features

- **Transparent** — images are silently converted to text. The LLM never knows there was an image
- **Zero dependencies** — single ESM file, no build step, no npm deps
- **Multi-image support** — paste multiple images at once; each is analyzed and numbered
- **Local-first** — works with any OpenAI-compatible VL API (llama.cpp, vLLM, etc.)
- **Smart caching** — reuses analysis results for duplicate images across conversation turns
- **HTTP & data URLs** — handles both pasted images (data: URLs) and web-hosted images
- **Smart skip** — automatically detects when the current chat model natively supports images and skips interception

## Installation

### For Humans

Copy and paste this prompt to your OpenCode agent:

```
Install and configure opencode-vision-paste by following the instructions here:
https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

### For LLM Agents

```bash
curl -s https://raw.githubusercontent.com/wsaaaqqq/opencode-vision-paste/main/readme/INSTALL.md
```

Or read the [Installation Guide](readme/INSTALL.md) directly.

---

## Quick Start

1. **Install** the plugin (see [Installation](#installation) above)
2. **Configure** your VL API endpoint in `.opencode/vision-paste.config.jsonc` (optional — defaults work if you have a local llama.cpp running)
3. **Paste an image** in any OpenCode chat — watch it turn into text

---

## Configuration

All settings are optional. The plugin works with sensible defaults.

| Option | Default | Description |
|--------|---------|-------------|
| `apiBaseUrl` | `http://192.168.9.44:5678/v1` | OpenAI-compatible VL API endpoint |
| `apiModel` | `Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Model name for the VL API |
| `apiKey` | `""` | API key (leave empty if not required) |
| `promptTemplate` | `""` | Custom prompt (overrides `promptLocale`); `{userText}` is replaced with the user's message |
| `promptLocale` | `zh` | Built-in prompt language: `en`, `zh`, `ja`, `ko`, `es`, `fr`, `de`, `ru`, `pt` |
| `skipIfModelSupportsVision` | `true` | Skip interception when the current chat model natively supports images |
| `visionModels` | `[]` | Extra model ID patterns to treat as vision-capable (case-insensitive) |
| `healthCheckOnStart` | `true` | Ping VL API on session start; warn if unreachable |
| `verbose` | `false` | Show analysis progress in chat messages |
| `errorHints` | `true` | Include troubleshooting suggestions in error messages |

**Config file locations** (first found wins):
1. `.opencode/vision-paste.config.jsonc` (project-level)
2. `~/.config/opencode/vision-paste.config.jsonc` (user-level)

Full reference: [CONFIGURATION.md](CONFIGURATION.md)

---

## How it works

```
User pastes image
       ↓
opencode-vision-paste intercepts `experimental.chat.messages.transform`
       ↓
Decodes image (data URL or HTTP) → saves temp file
       ↓
Sends to local VL API (OpenAI-compatible chat completions)
       ↓
Replaces image part with analysis text
       ↓
Temp file deleted — LLM sees text only
```

The plugin hooks into OpenCode's `experimental.chat.messages.transform` pipeline, running before the message is sent to the LLM.

---

## VL API Setup

The plugin needs a running VL API. Choose one:

### Docker (one command)

```bash
# 1. Download the model
mkdir models
wget -P models https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/Qwen3VL-8B-Instruct-Q4_K_M.gguf

# 2. Start the server
docker compose up -d
```

### Ollama

```bash
ollama pull qwen2.5-vl:7b
# Then configure apiBaseUrl: http://localhost:11434/v1
```

See [examples/](examples/) for configuration presets.

---

## CLI

```
npx opencode-vision-paste init     # Interactive setup wizard
npx opencode-vision-paste doctor   # Diagnose plugin + VL API
npx opencode-vision-paste config   # Show current configuration
```

---

## FAQ

**Q: Images are not being analyzed?**
Run `npx opencode-vision-paste doctor` to check your setup. Common issues: VL API not running, wrong URL, or model not loaded.

**Q: How do I use a different VL API backend?**
Update `apiBaseUrl` in `.opencode/vision-paste.config.jsonc`. Any OpenAI-compatible endpoint works (Ollama, vLLM, llama.cpp, LM Studio, etc.).

**Q: Can I force the plugin to always process images?**
Set `"skipIfModelSupportsVision": false` in your config.

**Q: The prompt is in Chinese, can I change it?**
Set `"promptLocale": "en"` or provide a custom `"promptTemplate"`.

---

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
