<div align="center">

# Gemini App2API

**Your coding agents. Your Gemini subscriptions. Zero-dependency native HTTP/2.**

Use your eligible Google Gemini accounts in **Pi**, **OpenClaw**, **OpenCode**, **Claude Code**, **Cursor**, **Cline**, **Roo Code**, **Codex CLI**, **MCP clients**, and OpenAI SDKs—via standalone in-process plugins (no server needed) or a self-hosted Node.js gateway with multi-account pooling and native `POST /mcp`.

[![CI](https://github.com/ShawTim/gemini-app2api/actions/workflows/ci.yml/badge.svg)](https://github.com/ShawTim/gemini-app2api/actions/workflows/ci.yml)
[![pi-gemini-app on npm](https://img.shields.io/npm/v/pi-gemini-app?logo=npm&label=pi-gemini-app)](https://www.npmjs.com/package/pi-gemini-app)
[![pi-gemini-app on Pi Packages](https://img.shields.io/badge/Pi%20Packages-pi--gemini--app-6366F1)](https://pi.dev/packages/pi-gemini-app?name=pi-gemini-app)
[![openclaw-gemini-app on npm](https://img.shields.io/npm/v/openclaw-gemini-app?logo=npm&label=openclaw-gemini-app)](https://www.npmjs.com/package/openclaw-gemini-app)
[![openclaw-gemini-app on ClawHub](https://img.shields.io/badge/ClawHub-openclaw--gemini--app-F97316)](https://clawhub.ai/shawtim/plugins/openclaw-gemini-app)
[![opencode-gemini-app on npm](https://img.shields.io/npm/v/opencode-gemini-app?logo=npm&label=opencode-gemini-app)](https://www.npmjs.com/package/opencode-gemini-app)
[![mcp-gemini-app on npm](https://img.shields.io/npm/v/mcp-gemini-app?logo=npm&label=mcp-gemini-app)](https://www.npmjs.com/package/mcp-gemini-app)
![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=nodedotjs&logoColor=white)
![Zero Runtime Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-0A84FF)
![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-64748B)](LICENSE)

**English** · [繁體中文](README.zh.md) · [简体中文](README.zh-CN.md) · [Quick Start](#quick-start) · [Connect Client](#connect-your-client) · [Models & Quota](#quota-consumption) · [API Reference](docs/API_SUPPORT.md) · [Operations](docs/OPERATIONS.md)

</div>

> [!IMPORTANT]
> **Unofficial interoperability research project.** Not affiliated with or endorsed by Google. Sign in personally with your own eligible Google accounts—no credentials, tokens, or Google binaries are distributed. Read [DISCLAIMER.md](DISCLAIMER.md).

---

<a id="quick-start"></a>
## Quick Start

### Path A — Standalone Native Plugins (No Server Required)

![gemini-app2api — Zero-Dependency Native Extensions for Pi, OpenClaw, OpenCode & MCP](docs/assets/extensions-overview.jpg)

<a id="pi-extension"></a><a id="openclaw-plugin"></a>

| Host | Install / Run | Sign In & Quota | Links & Guide |
|---|---|---|---|
| **Pi / GooeyPi** | `pi install npm:pi-gemini-app` | `/login gemini-app` · `/gemini-quota` | [npm](https://www.npmjs.com/package/pi-gemini-app) · [Pi Packages](https://pi.dev/packages/pi-gemini-app?name=pi-gemini-app) · [Guide](extensions/pi/README.md) |
| **OpenClaw** | `openclaw plugins install openclaw-gemini-app` *(or `npm:openclaw-gemini-app`)* | `openclaw models auth login --provider gemini-app` · `/usage` | [npm](https://www.npmjs.com/package/openclaw-gemini-app) · [ClawHub](https://clawhub.ai/shawtim/plugins/openclaw-gemini-app) · [Guide](extensions/openclaw/README.md) |
| **OpenCode** | V2: `opencode plugin add opencode-gemini-app` (V1: `"plugin": ["opencode-gemini-app"]` in `opencode.json`) | `/connect` (`gemini-app`) | [npm](https://www.npmjs.com/package/opencode-gemini-app) · [Guide](extensions/opencode/README.md) |
| **Standalone MCP (stdio)** | `npx -y mcp-gemini-app` | `npx -y mcp-gemini-app login` · `quota` | [npm](https://www.npmjs.com/package/mcp-gemini-app) · [Guide](extensions/mcp/README.md) |

All standalone extensions run in-process over direct HTTP/2 (`15s` PING keepalives, `HTTPS_PROXY` support, 256 tools, parallel multimodal image uploads, automatic Free-tier `gemini-auto` filtering).

### Path B — Self-Hosted OpenAI-Compatible & MCP Gateway

Requires **Node.js `>= 22`** (macOS / Linux / WSL2) or **Docker Compose**, plus a Google account with Gemini access (AI Studio API keys are a different service).

**Node.js:**

```sh
git clone https://github.com/ShawTim/gemini-app2api.git && cd gemini-app2api
npm ci --omit=dev --ignore-scripts
npm start
```

**Docker Compose:**

```sh
git clone https://github.com/ShawTim/gemini-app2api.git && cd gemini-app2api
read -r -s -p 'Admin password (>= 12 chars): ' GATEWAY_ADMIN_PASSWORD; echo
export GATEWAY_ADMIN_PASSWORD && docker compose up -d --build
```

<details>
<summary><strong>Or run pre-built GHCR image directly (<code>linux/amd64</code> &amp; <code>linux/arm64</code>)</strong></summary>

```sh
read -r -s -p 'Admin password (>= 12 chars): ' GATEWAY_ADMIN_PASSWORD; echo
docker run -d --name gemini-app2api --init --restart unless-stopped \
  -p 127.0.0.1:18989:18989 -p 127.0.0.1:18765:18765 \
  -v gemini-gateway-state:/data \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -e GATEWAY_HOST=0.0.0.0 -e GATEWAY_CALLBACK_HOST=0.0.0.0 -e GATEWAY_ALLOW_REMOTE=1 \
  -e GATEWAY_PUBLIC_ORIGIN=http://127.0.0.1:18989 -e GATEWAY_ADMIN_PASSWORD \
  ghcr.io/shawtim/gemini-app2api:latest
```

See [Operations Guide](docs/OPERATIONS.md#docker--linux-loopback-publishing--linux-docker-本機發佈) for custom ports, TLS reverse proxies, and SSH tunneling.

</details>

**Finish setup in browser:** Open **http://127.0.0.1:18989/admin/** → **Accounts → + Google sign-in** → click **Test** to verify entitlement → **API keys → Create key**.

---

<a id="connect-your-client"></a>
## Connect Your Client

| Setting | Value |
|---|---|
| **Base URL** | `http://127.0.0.1:18989/v1` *(or `http://gateway:18989/v1` inside Compose / your HTTPS proxy URL)* |
| **MCP Endpoint** | `http://127.0.0.1:18989/mcp` *(Streamable HTTP; toggleable in Admin **Settings**; stdio bridge via `bin/gemini-gateway mcp`)* |
| **API Key** | Client key from **API keys** *(authenticates both `/v1/*` and `/mcp`)* |
| **Models** | `gemini-neon` *(flagship Pro; `gemini-argon` aliases here)*, `gemini-hydrogen` *(fast)*, `gemini-flash-lite` |
| **Endpoints** | `GET /v1/models` · `POST /v1/chat/completions` · `POST /v1/responses` · `POST /mcp` ([full contract](docs/API_SUPPORT.md)) |

```sh
curl -fsS http://127.0.0.1:18989/v1/chat/completions \
  -H "Authorization: Bearer $GEMINI_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-neon","messages":[{"role":"user","content":"Hello!"}]}'
```

<details>
<summary><strong>Client Recipes — MCP (Claude Code / Cursor / Windsurf / VS Code), Codex CLI, Cline / Roo Code, Cherry Studio, OpenAI SDKs</strong></summary>

- **MCP Clients (Streamable HTTP — Claude Code, Cursor, Windsurf, Cline)** — exposes `ask_gemini`, `gemini_search`, and `gemini_quota` backed by your gateway's multi-account pool (strict JSON, one-click copyable from Admin UI):
  ```json
  {
    "mcpServers": {
      "gemini-app": {
        "type": "http",
        "url": "http://127.0.0.1:18989/mcp",
        "headers": {
          "Authorization": "Bearer ${GEMINI_GATEWAY_KEY}"
        }
      }
    }
  }
  ```
  - **VS Code (`.vscode/mcp.json`):** use top-level `"servers"` instead of `"mcpServers"` with `"type": "http"`.
  - **Codex CLI (`~/.codex/config.toml`):** use `[mcp_servers.gemini_app]` with `url = "http://127.0.0.1:18989/mcp"` and `bearer_token_env_var = "GEMINI_GATEWAY_KEY"`.
  - **stdio-only MCP clients (e.g. Claude Desktop):** invoke your local `node /path/to/gemini-app2api/bin/gemini-gateway mcp` with `GEMINI_GATEWAY_URL` + `GEMINI_GATEWAY_API_KEY`, or use standalone [`extensions/mcp`](extensions/mcp/README.md).
- **OpenAI Codex CLI (`~/.codex/config.toml`)** — native `/v1/responses` + namespace tools:
  ```toml
  model = "gemini-hydrogen" # or "gemini-neon"
  model_provider = "gemini_app2api"
  model_reasoning_summary = "none"
  web_search = "disabled"

  [model_providers.gemini_app2api]
  name = "Gemini App2API"
  base_url = "http://127.0.0.1:18989/v1"
  env_key = "GEMINI_GATEWAY_KEY"
  wire_api = "responses"
  ```
- **Cline / Roo Code:** API Provider `OpenAI Compatible`, Base URL `http://127.0.0.1:18989/v1`, Model `gemini-hydrogen` or `gemini-neon`.
- **Cursor:** Settings → Models → add `gemini-neon` / `gemini-hydrogen` → Override OpenAI Base URL (HTTPS tunnel required if Cursor's cloud relay is active).
- **Cherry Studio / Open WebUI / SDKs:** OpenAI provider with `http://127.0.0.1:18989/v1`; see [`examples/client.mjs`](examples/client.mjs) and [`examples/client.py`](examples/client.py).

</details>

---

<a id="quota-consumption"></a>
## Models & Quota

| Model | Role | Native Mode | Advisory `context_window` |
|---|---|---:|---|
| **`gemini-neon`** | Gemini 4 Neon flagship Pro reasoning & coding (`gemini-argon` aliases here) | `PRO` (`3`) | `512,000` |
| **`gemini-hydrogen`** | Gemini 4 Hydrogen low-latency reasoning (~1.7–2.6× faster, lighter quota) | `FAST` (`1`) | `512,000` |
| **`gemini-flash-lite`** | High-throughput lightweight tasks | `6` | — |

Empirical `GetUsageInfo` observations on Gemini AI Pro accounts (`neon_pro_policy`; not official Google SLA figures):

| Workload | `gemini-hydrogen` | `gemini-neon` | Neon Multiple |
|---|---|---|---:|
| Massive code review + rewrite (`thinking=2`) | `~0.12%` weekly (`~76s`) | `~0.25%` weekly (`~198s`) | `~2.0×` |
| Multi-tool agent `tool_call` step (`thinking=2`) | `~0.024%` weekly (`~8s`) | `~0.037%` weekly (`~14s`) | `~1.56×` |
| Standard ~14 KB plan (`thinking=0`) | `~0.017%` weekly (`~28s`) | `~0.086%` weekly (`~36s`) | `~5.1×` |
| Est. 5-hour single-account capacity | `~40` rewrites / `~210` tool steps | `~20` rewrites / `~135` tool steps | — |

---

## Why Gemini App2API?

<p align="center">
  <img src="docs/assets/mgga.jpg" alt="MGGA — GigaChad Gemini Model vs Derpy Consumer App Harness" width="320" />
  <br />
  <sub><strong>MGGA — Make Gemini Great Again:</strong> Free frontier Gemini models from a consumer chat harness into real engineering tools.</sub>
</p>

| Dimension | **Gemini App2API** | Web / Cookie Scrapers | Desktop Injection / MITM |
|---|---|---|---|
| **Transport** | Pure Node.js native HTTP/2 (`ProcessQuery`) + parallel image uploads | Fragile DOM / browser cookies | Binary hooks / local MITM |
| **Auth & Pool** | Standard Google OAuth (`0600` local state), multi-account failover & quota bars | Frequent cookie expiry / CAPTCHA | Single active desktop GUI |
| **Agent Safety** | Schema-validated tools (256 declarations), hallucinated tool-result suppression, `incomplete: true` contract | Unvalidated regex / broken loops | Consumer UI limits |
| **Footprint** | Node.js `>= 22`, **`0` production npm dependencies** | Playwright / Python stacks | OS & binary version locked |

**Highlights:**
- **Resilient HTTP/2 & Proxy Support:** `15s` HTTP/2 `PING` + TCP keepalives, zero-dependency `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY` `CONNECT` tunneling, retryable `503 SERVER_SHUTDOWN` restarts, and bounded automatic recovery.
- **Built for Long E2E & Agent Loops:** Up to `256` caller tool declarations (`512 KiB` / `16,384` nodes), structured outputs (`json_schema` / `json_object`), opt-in `native_search` citations, and parallel HTTP/2 multimodal image uploads (`256` images / `20 MiB` per image safety bounds + per-account in-memory `blobId` caching).
- **Zero-Dependency Security & Trilingual Console:** `0700`/`0600` private state, `scrypt` admin auth, SHA-256 key vault, CSRF/Origin guards, one-click `POST /mcp` toggle & quick-connect snippets, and live per-account × per-model telemetry (`English` / `繁體中文` / `简体中文`, zero prompt logging).

![Gemini App2API Operations Console — Dark Theme (synthetic demo data)](docs/assets/admin-v2-demo-dark-desktop.png)

<details>
<summary><strong>More Console Screenshots (Light Theme &amp; Mobile 繁體中文)</strong></summary>

| Light Theme — Account Inspector | Mobile — Traditional Chinese (`繁體中文`) |
|---|---|
| ![Light theme](docs/assets/admin-v2-demo-light-desktop.png) | ![Mobile console](docs/assets/admin-v2-demo-zh-hk-mobile.png) |

</details>

---

## Documentation

| Document | Contents |
|---|---|
| [Pi Extension (`extensions/pi/README.md`)](extensions/pi/README.md) | Standalone `pi-gemini-app` plugin for Pi Coding Agent & GooeyPi |
| [OpenClaw Plugin (`extensions/openclaw/README.md`)](extensions/openclaw/README.md) | Standalone `openclaw-gemini-app` provider plugin for OpenClaw & ClawHub |
| [OpenCode Plugin (`extensions/opencode/README.md`)](extensions/opencode/README.md) | Standalone `opencode-gemini-app` native provider plugin for OpenCode (Bun & Node) |
| [MCP Server (`extensions/mcp/README.md`)](extensions/mcp/README.md) | Standalone stdio MCP server (`ask_gemini`, `gemini_search`, `gemini_quota`) |
| [API Support (`docs/API_SUPPORT.md`)](docs/API_SUPPORT.md) | Endpoints, tools, structured outputs, images, `native_search`, error codes |
| [Operations (`docs/OPERATIONS.md`)](docs/OPERATIONS.md) | `.env` config, Docker Compose, TLS reverse proxy, `launchd`, troubleshooting |
| [Completion Contract (`docs/COMPLETION_CONTRACT.md`)](docs/COMPLETION_CONTRACT.md) | Partial-output preservation, zero-output `GENERATION_FAILED`, agent loop safety |
| [Account Lifecycle (`docs/ACCOUNT_LIFECYCLE.md`)](docs/ACCOUNT_LIFECYCLE.md) · [Limits (`docs/LOCKS_AND_LIMITS.md`)](docs/LOCKS_AND_LIMITS.md) | OAuth, ToS consent, quota telemetry, concurrency & payload bounds |
| [Testing (`docs/CURRENT_CONTRACT_TESTS.md`)](docs/CURRENT_CONTRACT_TESTS.md) · [Security (`SECURITY.md`)](SECURITY.md) · [Changelog (`CHANGELOG.md`)](CHANGELOG.md) | Offline E2E suites, security model, release history |

---

<div align="center">

[MIT License](LICENSE) · [Disclaimer](DISCLAIMER.md) · [Security Policy](SECURITY.md) · [Contributing](CONTRIBUTING.md)

<sub>Unofficial self-hosted interoperability software. No Google binaries, credentials, tokens, accounts, or quota are distributed.</sub>

</div>
