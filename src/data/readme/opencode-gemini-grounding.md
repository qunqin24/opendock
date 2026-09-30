<div align="center">

# opencode-gemini-grounding

<p>
  <strong>High-performance LLM Search Grounding Plugin built natively for OpenCode V2</strong><br />
  Powered by Google Gemini Search Grounding with academic-style inline citations (<code>[1]</code>, <code>[2]</code>), clickable multi-source cards, system-wide WebSearch auto-routing, and persistent zero-overhead caching.
</p>

<p>
  <a href="https://www.npmjs.com/package/opencode-gemini-grounding"><img src="https://img.shields.io/npm/v/opencode-gemini-grounding?color=blue&style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/opencode-gemini-grounding"><img src="https://img.shields.io/npm/dt/opencode-gemini-grounding?color=brightgreen&style=flat-square" alt="npm downloads" /></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-V2%20Compatible-4F46E5?style=flat-square" alt="OpenCode V2" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/Dependencies-Zero-success?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/ESM-Native-blue.svg?style=flat-square" alt="ESM" />
</p>

<p>
  <a href="README.md"><strong>English</strong></a> · <a href="README_CN.md"><strong>简体中文</strong></a>
</p>

---

</div>

## 🌟 Overview

`opencode-gemini-grounding` is a high-performance web search extension developed strictly following the OpenCode V2 plugin specification. Regardless of your active primary model (Claude, DeepSeek, GPT, or local models), this plugin equips it with real-time web search, fact verification, and source attribution capabilities.

Unlike standard web search tools, it returns concise, fact-checked answers accompanied by **academic-style inline citations (`[1]`, `[2]`)** calculated through a **UTF-8 byte offset reverse-slicing algorithm**, complete with verified source URLs and actual search queries.

---

## ✨ Features

- **🚀 Native OpenCode V2 Architecture**: Built strictly on OpenCode V2's `id` + `setup(ctx)` lifecycle, integrating deeply with `ctx.tool`, `ctx.websearch`, `ctx.storage`, and `context.progress`.
- **🌐 Dual-Entry Search Architecture (WebSearch + Custom Tool)**:
  - **System WebSearch Provider (`ctx.websearch`)**: Automatically registers as an OpenCode V2 default `websearch` provider for seamless, transparent search in everyday conversations;
  - **Custom Professional Tool (`ctx.tool`)**: Exposes `google_grounding` and `websearch_cited` under the Code Mode `search` namespace (`tools.search.google_grounding`) with full parameter control.
- **🎯 Smart Anti-Bloat Slicing (Independent Clickable Cards)**:
  - Every discovered source is rendered as an independent clickable card in the UI, allowing instant navigation to any specific webpage;
  - The first card carries the complete synthesis report, while subsequent cards extract concise cited sentence snippets—**saving ~87.5% duplicate tokens (20,000+ context tokens saved per search)**.
- **⚡ Native Persistent Caching (`ctx.storage`)**: Sandboxed key-value caching with configurable TTL (default 10m). Repeating queries return in 0ms with zero token cost and immunity to HTTP 429 limits.
- **🔔 Live Progress Feedback (`context.progress`)**: Real-time status reporting in TUI and Web UI ("Searching Google...", "Found cached results", "Falling back to next model...").
- **⚙️ Standardized `ctx.options` Configuration**: Structured plugin configuration via `opencode.jsonc` with support for `{env:VAR}` automatic resolution.
- **⚡ Automatic Fallback Chain**: Built-in fault tolerance—configured with a generous 45s per-model timeout and 180s (3 min) total timeout. Automatically rotates through candidate models on rate limits (HTTP 429) or gateway blips (502/503), while immediately halting on fatal auth errors (401/403).
- **🧠 Dynamic Model Switching & Normalization**: Supports runtime model selection per search call; automatically strips provider prefixes like `google/` to prevent 404s.
- **📍 Academic-Style Precision Citations & Clean Markdown**: Calculates exact UTF-8 byte offsets from Gemini's `groundingSupports` with dynamic index remapping (preventing broken citations) and renders clean Markdown hyperlinks `[1] [Title](url)`.
- **🌐 Reverse Proxy & Custom Gateway Ready**: Dual authentication support with both `x-goog-api-key` and `Authorization: Bearer`, ensuring seamless compatibility with OneAPI, NewAPI, and LAN gateways.

---

## 🔀 Dual Search Architecture

The plugin provides two parallel search pathways to satisfy both transparent daily use and specialized scripted workflows:

```text
                    User Prompt Input
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
     [Normal Chat]                   [Specialized Prompt]
  "What's the weather?"          "Search with gemini-3.8-flash"
  "Review of RX 9070 XT"         "Batch query 3 items in Code Mode"
            │                               │
            ▼                               ▼
 LLM calls websearch(...)        LLM calls google_grounding(...)
            │                               │
            ▼                               │
 OpenCode Native Dispatch                   │
(Handled by this plugin)                    │
            │                               │
            └───────────────┬───────────────┘
                            ▼
               Unified Google Grounding Engine
      (Shares 45s timeouts, fallback chain, and cache)
```

| Entry Pathway | Invocation Method | Best For | Key Advantages |
| :--- | :--- | :--- | :--- |
| **System WebSearch** | LLM calls `websearch({ query })` | Normal chats, default agent browsing | **Completely transparent**. Renders multi-source clickable cards without duplicate token bloat. |
| **Custom Professional Tool** | Call `google_grounding` or `tools.search.google_grounding` | Deep research, Code Mode batch scripts, custom models | **Advanced control**. Supports passing `model`, `context` guidelines, `max_sources`, etc. |

---

## 📦 Installation & Usage

### Method 1: npm Package (Recommended · Zero-Config)

No cloning or manual symlinks needed. Add the plugin directly to the `plugins` array in your OpenCode configuration `~/.config/opencode/opencode.jsonc` (on Windows: `%USERPROFILE%\.config\opencode\opencode.jsonc`):

#### 1. Basic Setup
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-gemini-grounding"
  ]
}
```

#### 2. Advanced Setup with Options (Recommended)
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-gemini-grounding",
      "options": {
        "model": "gemini-3.5-flash-lite",      // Preferred search model
        "apiKey": "{env:GOOGLE_API_KEY}",       // Auto-resolved from environment
        "cacheTtlMs": 600000,                  // Storage cache TTL in ms (default 10m; 0 disables)
        "requestTimeoutMs": 45000,              // Single-model timeout (45s)
        "timeoutMs": 180000,                    // Total fallback chain timeout (3m)
        "setDefaultWebsearch": true             // Set as default OpenCode V2 websearch provider
      }
    }
  ]
}
```

---

### Method 2: Local Development Setup (For Contributors)

For local development or testing modifications:

#### Global Plugin Bridge
Create `~/.config/opencode/plugins/google-grounding.js`:
```javascript
export { default } from "file:///D:/OpenCode/opencode-gemini-grounding/index.js";
```

#### Or Directory Junction / Symlink
```powershell
# Windows (PowerShell)
cmd /c mklink /J "$env:USERPROFILE\.config\opencode\plugins\opencode-gemini-grounding" "D:\OpenCode\opencode-gemini-grounding"
```

Verify that OpenCode recognizes the plugin:
```bash
opencode plugin list
```

---

## 🛠️ Tool Signature

When invoking via custom tools (`google_grounding` or `websearch_cited`), the following parameters are accepted:

| Argument | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `query` | `string` | **Yes** | The question or natural language search query. |
| `model` | `string` | No | Optional Gemini model ID (e.g. `gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.1-flash-lite`). Defaults to configured model. |
| `context` | `string` | No | Optional extra background, constraints, or guidelines for the search. |
| `max_sources` | `number` | No | Maximum number of grounded source links to return (1-20, default: `8`). |

---

## ⚙️ Configuration & Priority

### 1. Model Resolution
1. Dynamic `model` argument provided in the tool call.
2. `options.model` in `opencode.jsonc` plugin options.
3. `OPENCODE_GOOGLE_MODEL` environment variable.
4. `providers.google.model` or `providers.google.settings.model` in `~/.config/opencode/opencode.jsonc`.
5. `providers.google.options.websearch_cited.model`.
6. Default fallback: `gemini-3.5-flash-lite`.

> **Automatic Fallback Chain**:
> If a model fails or hits rate limits, the plugin tries the next candidate automatically:
> `[Requested Model] -> gemini-3.5-flash-lite -> gemini-3.8-flash -> gemini-3.7-flash -> gemini-3.1-flash-lite -> gemini-3-flash-preview -> gemini-2.5-flash`.

### 2. Base URL (API Gateway)
1. `options.baseURL` in `opencode.jsonc` plugin options.
2. `OPENCODE_GOOGLE_BASE_URL` environment variable.
3. `providers.google.settings.baseURL` in `~/.config/opencode/opencode.jsonc`.
4. Default: `https://generativelanguage.googleapis.com/v1beta` (Official Google API).

### 3. API Key
1. `options.apiKey` in `opencode.jsonc` plugin options (supports `{env:VAR}`).
2. `OPENCODE_GOOGLE_API_KEY` / `GOOGLE_API_KEY` / `GEMINI_API_KEY` environment variables.
3. Stored OpenCode credentials in `~/.local/share/opencode/auth.json` (`google.key` or `indor.key`).
4. `providers.google.settings.apiKey` in `opencode.jsonc`.

---

## 📝 Example Output

```markdown
According to the latest meteorological bulletins, Beijing weather for today (September 27) is clear and pleasant after rain[1]:

* **Condition**: Becoming clear and sunny during the day, partly cloudy at night[1][2].
* **Temperature**: Daytime high around 26°C, dropping to 15°C~16°C overnight[1][3].
* **Wind**: Northerly winds around Force 3 with gusts reaching Force 5~6 during daytime[1].

Sources:
[1] [Beijing Daily - Meteorological Bulletin](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)
[2] [China Weather - Precipitation & Conditions](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)
[3] [National Meteorological Center - Forecast](https://vertexaisearch.cloud.google.com/grounding-api-redirect/...)

Search queries: Beijing weather September 27; Beijing meteorological bureau report
```

---

## 🙏 Acknowledgements

This project builds upon the ideas and implementations of two pioneering OpenCode V1 plugins:

- **[ghoulr/opencode-websearch-cited](https://github.com/ghoulr/opencode-websearch-cited)** by [@ghoulr](https://github.com/ghoulr): For the brilliant concept of LLM-grounded search with academic-style inline citations (`[1]`, `[2]`), and the UTF-8 byte offset insertion algorithm for `groundingSupports`.
- **[janaki-sasidhar/opencode-google-grounding](https://github.com/janaki-sasidhar/opencode-google-grounding)** by [@janaki-sasidhar](https://github.com/janaki-sasidhar): For the lightweight, zero-intrusive standalone tool design, Gemini Search Grounding integration, and flexible custom `baseURL` / proxy resolution.

---

## 📄 License

Distributed under the [MIT License](./LICENSE).
