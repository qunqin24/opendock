# OpenKilo

[![npm version](https://img.shields.io/npm/v/openkilo.svg)](https://www.npmjs.com/package/openkilo)
[![npm downloads](https://img.shields.io/npm/dt/openkilo)](https://www.npmjs.com/package/openkilo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Access **40+ free AI models** through Kilo Gateway. Zero-config, no API key required for free models.

## Installation

### 🤖 Let an LLM do it (Recommended)

Paste this into any LLM agent (OpenCode, Claude Code, Cursor, etc.):

```text
Install the openkilo plugin by following: https://raw.githubusercontent.com/AnganSamadder/openkilo/main/README.md
```

<details>
<summary><b>Instructions for LLM Agents</b></summary>

To install this plugin, please perform the following steps for the user:

1. **Install the NPM package globally:**
   ```bash
   npm install -g openkilo
   ```
   *Note: This plugin requires no additional setup - free models work instantly.*

2. **Configure OpenCode:**
   Add `"openkilo"` to the `plugin` array in the user's config file (usually `~/.config/opencode/opencode.json`).

   ```json
   {
     "plugin": [
       "openkilo"
     ]
   }
   ```

3. **Verify & Finalize:**
   - Tell the user: **"Installation complete! Restart OpenCode and select any model under the 'OpenKilo' provider to start using free AI models instantly."**

</details>

### 👤 For Humans (Manual)

1. **Install via NPM:**
   ```bash
   npm install -g openkilo
   ```

2. **Enable the Plugin:**
   Add `"openkilo"` to your `~/.config/opencode/opencode.json`:
   ```json
   {
     "plugin": [
       "openkilo"
     ]
   }
   ```

3. **Use Free Models:**
   Restart OpenCode and select any model under the **OpenKilo** provider. No API key needed!

## ✨ Features

- **Zero-config free models**: 40+ free models available instantly without authentication
- **Kilo Gateway**: Uses Kilo's free OpenRouter-compatible gateway at `api.kilo.ai`
- **Dual authentication**: OAuth browser flow or API key for 350+ paid models
- **Auto-refresh**: Model registry updates automatically on OpenCode startup
- **Simple tools**: `/kilo_login`, `/kilo_logout`, `/kilo_status`, `/kilo_models`, `/kilo_refresh`

## 🎯 Available Free Models

| Model | Context | Output | Description |
|-------|---------|--------|-------------|
| `z-ai/glm-5:free` | 202K | 131K | Z.AI's flagship model for complex systems |
| `deepseek/deepseek-r1-0528:free` | 164K | 164K | DeepSeek R1 reasoning model |
| `meta-llama/llama-3.3-70b-instruct:free` | 128K | 128K | Meta Llama 3.3 70B |
| `qwen/qwen3-coder:free` | 262K | 262K | Qwen3 Coder 480B |
| `minimax/minimax-m2.5:free` | 205K | 131K | MiniMax M2.5 |
| `google/gemma-3-27b-it:free` | 131K | 8K | Google Gemma 3 27B |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 128K | 8K | Mistral Small 3.1 |

And **30+ more free models**!

## 🔐 Authentication (For Paid Models)

To access 350+ paid models, authenticate with Kilo:

```
/kilo_login
```

This opens a browser for OAuth authentication. Alternatively, use an API key:

```
/kilo_login --method api-key --api-key YOUR_KEY
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `kilo_login` | Authenticate with Kilo (OAuth or API key) |
| `kilo_logout` | Clear stored credentials |
| `kilo_status` | Check authentication status |
| `kilo_refresh` | Force refresh model registry |
| `kilo_models` | List available models |

## ⚙️ Configuration

| File | Purpose |
|------|---------|
| `~/.config/openkilo/auth.json` | Stored credentials |
| `~/.cache/openkilo/gateway-models.json` | Model registry cache |

## ❓ Troubleshooting

### Models Not Showing
1. Check OpenCode config has `"openkilo"` in the `plugin` array
2. Restart OpenCode
3. Run `/kilo_refresh` to force refresh the model registry

### Free Models Not Working
- Free models should work without any API key
- The plugin uses `apiKey: "anonymous"` for free access
- If you see authentication errors, run `/kilo_status` to check

### Paid Models Require Auth
- Run `/kilo_login` to authenticate
- Use `--method api-key` if you have a Kilo API key

## 🔧 Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint
```

## 📄 License

MIT
