# opencode-antigravity-acp

[![npm](https://img.shields.io/npm/v/opencode-antigravity-acp.svg)](https://www.npmjs.com/package/opencode-antigravity-acp)
[![CI](https://github.com/system1970/opencode-antigravity-acp/actions/workflows/ci.yml/badge.svg)](https://github.com/system1970/opencode-antigravity-acp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Use your **Antigravity subscription models** inside **OpenCode Desktop & CLI** through Google's official local `agy acp` stdio protocol — with full OpenCode Code Mode (`mcp_oc_execute`), MCP tools, skills, `AGENTS.md`, native approval controls, and bidirectional cross-model conversation handoff.

![Antigravity ACP running Gemini 4 Hydrogen in OpenCode Desktop with Code Mode MCP](./assets/screenshot.jpg)

---

## Why ACP instead of OAuth / API-proxy plugins?

Plugins like OAuth token extractors or local reverse proxies pull credentials out of local storage and replay private Cloud Code / Antigravity HTTP endpoints with spoofed headers. Combined with automated retry loops on `429` responses, that pattern routinely triggers abuse bans.

This plugin follows the same official-harness architecture used by tools like **T3 Code** and **Zed ACP**:

| Aspect | OAuth / Proxy Plugins | `opencode-antigravity-acp` (Official ACP) |
| :--- | :--- | :--- |
| **Auth & headers** | Extracts OAuth tokens; spoofs IDE/API headers | None — spawns your local signed-in `agy acp` binary directly |
| **Protocol** | Unofficial private HTTP API emulation | Official stdio JSON-RPC Agent Client Protocol (`agy acp --stdio --process-per-session`) |
| **Workspace tools** | Often loses OpenCode Code Mode / MCPs | Bridges OpenCode Code Mode, MCP servers & skills over localhost Bearer-auth HTTP MCP |
| **Internal OpenCode signatures** | Raw OpenCode prompt parts leak upstream | Allowlist sanitizer strips OpenCode-only tools (`tools.opencode.*`, `session_move`) |
| **429 / Quota error handling** | Often retries repeatedly in tight loops | Fail-fast circuit breaker halts on attempt #1 and trips a 60s persisted cooldown |

---

## Features

- **Dynamic Live Model & Reasoning Effort Discovery:** Queries `agy acp` (`session/new` `configOptions` + `models.availableModels`), caches the catalog in OpenCode plugin storage (6h TTL, deduplicated across open workspaces), and exposes all models with their individual reasoning efforts (`low`, `medium`, `high`, `xhigh` where supported) without family-collapsing in OpenCode Desktop.
- **OpenCode Tool Bridge (Loopback MCP Relay):** Exposes OpenCode tools (Code Mode `mcp_oc_execute`, `mcp_oc_skill`, connected MCP servers) to Antigravity over `127.0.0.1` with a per-instance random 24-byte Bearer token and tool-description sanitization.
- **Bidirectional Cross-Model Context Handoff:**
  - Switching **OpenCode model -> Antigravity ACP** passes prior prompts, responses, and tool outputs inside `<conversation_context_from_other_models>`.
  - Switching **Antigravity -> OpenCode model -> back to Antigravity** incrementally catches Antigravity up on only the unseen intermediate turns.
  - Switching **Antigravity -> OpenCode model** converts Antigravity's native `acp_*` hosted tool calls/results into compatible text summaries.
- **Zero Impact on Normal OpenCode Usage:** `McpRelayServer` and `agy acp` processes start lazily only when an `antigravity-acp/*` model is invoked. Normal OpenCode providers keep full Code Mode and prompt/response paths untouched.
- **Native OpenCode Desktop Controls & Slash Commands:** Compact `ACP` composer popover for switching Approval Modes (`Auto`, `Accept edits`, `Ask`, `Plan`), Tool Bridge modes (`Native + MCP` vs `All OpenCode`), resetting the live thread (`/agy-reset`), or refreshing models (`/agy-reload`).

---

## Safety Guardrails & Honest Risks

### Built-in Guardrails

1. **Zero token extraction / zero spoofing:** Never reads Antigravity auth databases or modifies official `agy` headers or binaries.
2. **Strict context allowlist:** Only user workspace instructions (`core/instructions` / `AGENTS.md`), `core/skill-guidance`, `core/mcp-guidance`, and external `core/codemode` namespaces are forwarded. OpenCode's internal `opencode` namespace (`session_move`, `tools.opencode.*`) is stripped before leaving OpenCode and verified by pre-flight assertion.
3. **Fail-fast attempt-1 circuit breaker:** Detects upstream API/quota errors (`RESOURCE_EXHAUSTED`, `code 429`, `code 403`, `PERMISSION_DENIED`, `API error (attempt N)`), cancels/kills `agy acp` immediately, trips a persisted 60-second cooldown, and suppresses automatic replay after server restarts.
4. **Clean plugin disable / reload:** Disposing mid-turn terminates the AI SDK stream cleanly without emitting retryable error chunks so OpenCode doesn't enter retry loops.

### Honest Risks to Know

- **Not zero-risk:** Every request runs against your real Antigravity account and shares your Antigravity usage quota. Upstream terms of service, rate limits, or `agy acp` flags can change at Google's discretion.
- **Local CLI requirement:** Requires `agy` installed and authenticated on your machine.
- **GUI surface stability:** The Desktop popover uses OpenCode v2's `gui-experimental` API (`@opencode/plugin/gui`), which is marked experimental by OpenCode and may evolve in future OpenCode releases.

---

## Prerequisites

1. **OpenCode** `>= 2.3.2`
2. **Antigravity CLI (`agy`)** installed and signed in (`agy --version` should work)
   - If OpenCode Desktop launches from a GUI menu without `~/.local/bin` or `/opt/homebrew/bin` in `PATH`, the plugin automatically probes common install paths and also supports setting `AGY_BIN=/path/to/agy`.

---

## Installation

### Option 1: Install via OpenCode CLI (Recommended)

```bash
opencode plugin add opencode-antigravity-acp
opencode service restart
```

*(You can also install directly from GitHub via `opencode plugin add github:system1970/opencode-antigravity-acp`.)*

### Option 2: Clone into OpenCode's Auto-Discovered Plugin Folder

OpenCode v2 automatically discovers local plugins placed under `~/.config/opencode/plugins/` (no build step required — the compiled `dist/gui-experimental.cjs` bundle is included):

```bash
git clone https://github.com/system1970/opencode-antigravity-acp ~/.config/opencode/plugins/opencode-antigravity-acp
opencode service restart
```

After restarting the OpenCode service, press `Ctrl+R` in OpenCode Desktop (if already open) and select any model under **Antigravity (ACP)** in the model picker.

---

## Controls & Slash Commands

When an **Antigravity (ACP)** model is active, an **`ACP`** pill appears above the composer:

- **Approval mode:**
  - `Auto` — Approves edits and shell commands automatically.
  - `Accept edits` — Approves file edits; prompts before shell commands.
  - `Ask` — Prompts before file edits and shell commands.
  - `Plan` — Creates a plan before executing changes.
- **Tool bridge:**
  - `Native + MCP` *(default)* — `agy acp` uses native file/shell tools while OpenCode bridges Code Mode, MCP servers, and skills.
  - `All OpenCode` — Routes OpenCode's `read`/`edit`/`bash` tools through OpenCode as well *(resets the ACP thread when switched)*.
- **Actions & Slash commands:**
  - `/agy-reset` — Disposes and resets the active Antigravity ACP thread for the current session.
  - `/agy-reload` — Forces live model & reasoning-effort discovery from `agy acp` and reloads providers.

---

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
```

## Contributing & Security

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and safety invariants.
- See [SECURITY.md](./SECURITY.md) for the security model and reporting guidelines.

## License

[MIT](./LICENSE) © system1970
