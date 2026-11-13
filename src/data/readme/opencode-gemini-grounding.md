<div align="center">

# opencode-gemini-grounding

<p>
  <strong>High-performance LLM Search Grounding Plugin built natively for OpenCode V2</strong><br />
  Powered by Google Gemini Search Grounding with academic-style inline citations (<code>[1]</code>, <code>[2]</code>), clickable multi-source cards, OpenChamber Web Search UI integration, system-wide WebSearch routing, and persistent zero-overhead caching.
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

- **🚀 Native OpenCode V2 Architecture**: Built strictly on OpenCode V2's `id` + `setup(ctx)` lifecycle, integrating deeply with `ctx.integration`, `ctx.tool`, `ctx.websearch`, `ctx.provider`, `ctx.storage`, and `context.progress`.
- **🖥️ OpenChamber Visual Configuration (`ctx.integration`)**: Registers **Google Gemini Grounding** directly in OpenChamber's **Settings → Web Search** panel with a full configuration form (API Key + optional Base URL + optional Preferred Model) plus automatic detection of environment variables.
- **🌐 Dual-Entry Search Architecture (WebSearch + Custom Tool)**:
  - **System WebSearch Provider (`ctx.websearch`)**: Registers as an OpenCode V2 `websearch` provider and sets itself as default only when no provider/disabled preference is already selected;
  - **Custom Professional Tool (`ctx.tool`)**: Exposes `google_grounding` under the Code Mode `search` namespace (`tools.search.google_grounding`) with full parameter control (optional legacy alias `websearch_cited` available via `enableLegacyAlias: true`).
- **🎯 Smart Sentence-Level Anti-Bloat Slicing (Independent Clickable Cards)**:
  - Every discovered source is rendered as an independent clickable card in the UI (with strict `http(s)://` URL validation/fallback), allowing instant navigation to any specific webpage;
  - The first card carries the complete synthesis report, while subsequent cards extract concise sentence-level snippets—**saving ~87.5% duplicate tokens (20,000+ context tokens saved per search)**.
- **⚡ Multi-Dimensional Caching (`ctx.storage`) & Subscriber-Aware Singleflight**: SHA-256 caching across `query + context + model + maxSources` (and custom `baseURL`) with configurable TTL (default 10m) and expired-entry cleanup, plus subscriber-refcounted in-flight deduplication that works cleanly even with per-caller `AbortSignal`s.
- **🔔 Live Progress Feedback (`context.progress`)**: Real-time status reporting in TUI and Web UI ("Searching Google...", "Found cached results", "Falling back to next model...").
- **🗄️ OpenCode V2.2.6+ `opencode.db` & `{file:...}` Support**: Automatically reads active key/OAuth credentials and metadata from `~/.local/share/opencode/opencode.db` (`credential` table in safe read-only WAL-aware mode), project-level `opencode.json(c)` / `.opencode/opencode.json(c)`, legacy `auth.json`, `{env:VAR}`, and `{file:path/to/secret}` placeholders.
- **⚡ Automatic Fallback Chain**: Powered by **`gemini-4-hydrogen`** by default with a **60s** per-model timeout and **180s** (3 min) total timeout. Automatically rotates through candidate models on rate limits (HTTP 429), gateway errors, or empty/`MAX_TOKENS`/blocked responses, while immediately halting on fatal auth errors (including non-JSON 401/403 responses).
- **🧠 Native Thinking Preservation & Dynamic Model Normalization**: Preserves `gemini-4-hydrogen`'s native server-side `HIGH` thinking by default; optionally accepts `thinkingLevel` (`LOW` / `MEDIUM` / `HIGH` / `XHIGH`) for Gemini 3/4 models. Strips provider prefixes (`google/`) and `#variant` suffixes (`google/gemini-4-hydrogen#xhigh` → `gemini-4-hydrogen`).
- **🔐 Smart Official vs. Reverse-Proxy Auth Routing**: Automatically sends `x-goog-api-key` only on official `*.googleapis.com` endpoints (preventing dual-header conflicts), `Authorization: Bearer` only for OAuth credentials, and dual headers on custom third-party gateways (OneAPI/NewAPI), with explicit `authMode` and custom `headers` support.

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
      (Shares 60s timeouts, fallback chain, and cache)
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
        "model": "gemini-4-hydrogen",           // Preferred search model
        "apiKey": "{env:GOOGLE_API_KEY}",       // Supports {env:VAR} and {file:path/to/key}
        "fallbackModels": [                     // Optional custom fallback chain
          "gemini-4-hydrogen",
          "gemini-3.8-flash",
          "gemini-3.5-flash-lite"
        ],
        "cacheTtlMs": 600000,                   // Storage cache TTL in ms (default 10m; 0 disables)
        "requestTimeoutMs": 60000,              // Single-model timeout (60s)
        "timeoutMs": 180000,                    // Total fallback chain timeout (3m)
        "authMode": "auto",                     // "auto" | "x-goog-api-key" | "bearer" | "both"
        "setDefaultWebsearch": true             // Set as default OpenCode V2 websearch provider
      }
    }
  ]
}
```

---

### 🖥️ Configuring Visually in OpenChamber

If you use **OpenChamber**, you can configure the plugin completely through the GUI without hand-editing JSON files:

1. **Settings → Web Search → Google Gemini Grounding**:
   - Select **Google Gemini Grounding** in the Web Search provider list;
   - Enter your **API Key**, optional **Base URL** (for reverse proxies / gateways), and optional **Preferred Model** (e.g. `gemini-4-hydrogen` or `gemini-3.8-flash`), then click **Save**;
   - Credentials and metadata are saved directly to OpenCode's `opencode.db` integration store and take effect immediately on the next search.
2. **Settings → OpenCode → Plugins**:
   - Add `"opencode-gemini-grounding"` or edit its full plugin `options` JSON (such as `fallbackModels`, `thinkingLevel`, `authMode`, `headers`, `requestTimeoutMs`, `timeoutMs`, `cacheTtlMs`, `setDefaultWebsearch`).

---

### Method 2: Local Development Setup (For Contributors)

For local development or testing modifications:

#### Global Plugin Bridge
Create `~/.config/opencode/plugins/opencode-gemini-grounding.js`:
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
| `model` | `string` | No | Optional Gemini model ID (e.g. `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.7-flash`). Provider prefixes and `#variant` suffixes are stripped automatically. |
| `context` | `string` | No | Optional extra background, constraints, or guidelines for the search. |
| `max_sources` | `number` | No | Maximum number of grounded source links to return (1-20, default: `8`). |

---

## ⚙️ Configuration & Priority

### 1. Model Resolution
1. Dynamic `model` argument provided in the tool call.
2. `options.model` in `opencode.jsonc` plugin options.
3. `OPENCODE_GOOGLE_MODEL` environment variable.
4. `metadata.model` saved in OpenChamber Web Search UI (`google-grounding` credential in `opencode.db` / `ctx.integration`).
5. `providers.google.model` / `providers.google.settings.model` (from live `ctx.provider`, project `opencode.json(c)` / `.opencode/opencode.json(c)`, or global `~/.config/opencode/opencode.json(c)`).
6. Default fallback: `gemini-4-hydrogen`.

> **Automatic Fallback Chain**:
> If a model fails, hits rate limits, or returns empty/`MAX_TOKENS`/blocked output, the plugin tries the next candidate automatically:
> `[Requested Model] -> gemini-4-hydrogen -> gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-3.7-flash -> gemini-3.1-flash-lite -> gemini-3-flash-preview -> gemini-2.5-flash`.
> You can override the default list via `options.fallbackModels` or the comma-separated `OPENCODE_GOOGLE_FALLBACK_MODELS` environment variable.

### 2. Base URL & Headers
1. `options.baseURL` in plugin options.
2. `OPENCODE_GOOGLE_BASE_URL` environment variable.
3. `metadata.baseURL` saved in OpenChamber Web Search UI (`google-grounding` credential).
4. `ctx.provider` / project & global `opencode.json(c)` `providers.google.settings.baseURL` (or `options.baseURL`).
5. Default: `https://generativelanguage.googleapis.com/v1beta` (Official Google API).

Custom headers from `providers.google.headers` / `settings.headers` / `options.headers` and `pluginOptions.headers` are merged automatically.

### 3. API Key & Credentials
1. `options.apiKey` in plugin options (supports `{env:VAR}` and `{file:path/to/secret}`).
2. `OPENCODE_GOOGLE_API_KEY` environment variable.
3. Stored OpenCode V2.2.6+ SQLite credential (`~/.local/share/opencode/opencode.db` `credential` table / `ctx.integration`) for `"google-grounding"` (or `options.integrationId`).
4. `GOOGLE_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` environment variables.
5. Stored OpenCode credentials (`opencode.db` or legacy `~/.local/share/opencode/auth.json`) for `"google"` / `"indor"` (supports both API keys and OAuth `access` tokens).
6. `providers.google.settings.apiKey` in live `ctx.provider`, project, or global `opencode.json(c)`.

### 4. Thinking Level & Auth Mode
- **`thinkingLevel` / `OPENCODE_GOOGLE_THINKING_LEVEL`**: Left unset by default so `gemini-4-hydrogen` keeps its native server-side `HIGH` thinking depth. Set to `"LOW"`, `"MEDIUM"`, `"HIGH"`, or `"XHIGH"` to explicitly inject `generationConfig.thinkingConfig.thinkingLevel` for Gemini 3/4 models (`/^gemini-[34]/i`).
- **`authMode` / `OPENCODE_GOOGLE_AUTH_MODE`**: Defaults to `"auto"` (sends `x-goog-api-key` only on `*.googleapis.com`, `Authorization: Bearer` only for OAuth, and both headers on third-party proxies). Can be forced to `"x-goog-api-key"`, `"bearer"`, or `"both"`.

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
