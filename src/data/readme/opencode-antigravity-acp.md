# opencode-antigravity-acp

[![npm](https://img.shields.io/npm/v/opencode-antigravity-acp.svg)](https://www.npmjs.com/package/opencode-antigravity-acp)
[![CI](https://github.com/system1970/opencode-antigravity-acp/actions/workflows/ci.yml/badge.svg)](https://github.com/system1970/opencode-antigravity-acp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Use your **Antigravity subscription models** inside **OpenCode Desktop & CLI** through Google's official local `agy acp` stdio protocol — seamless cross-model & same-process model switching via plain-text-only handoff, Code Mode by default, with Pure ACP opt-out.

![Antigravity ACP running Gemini 4 Hydrogen in OpenCode Desktop](./assets/screenshot.jpg)

---

## Terms of Service & Compliance — Read First

This plugin drives **only** the official local `agy acp --stdio --process-per-session` Agent Client Protocol server installed by Google. It never extracts OAuth tokens, never spoofs IDE/API headers, and never replays private HTTP endpoints.

- Antigravity Terms: https://antigravity.google/terms
- Why third-party clients are restricted: https://antigravity.google/docs/faq#why-cant-i-use-third-party-software-such-as-claude-code-openclaw-or-opencode-with-my-antigravity-login
- ACP authentication docs: https://antigravity.google/docs/ide/extensions/acp#authentication
- Community ToS clarification: https://discuss.ai.google.dev/t/tos-clarification-is-opencode-antigravity-acp-official-agy-acp-in-opencode-permitted-under-the-antigravity-terms-of-service/202970/2

### Auth boundary: `oauth-personal` vs `GEMINI_API_KEY` vs `agent-platform`

- **Consumer default (`oauth-personal`):** thin personal Google sign-in via your local `agy` CLI. After `initialize`, the plugin calls official `authenticate` with `{ methodId: "oauth-personal" }`. Use this for normal personal Antigravity usage.
- **`GEMINI_API_KEY` (`gemini-api-key`):** if `GEMINI_API_KEY` is set (or `ANTIGRAVITY_ACP_AUTH_METHOD=gemini-api-key`), the plugin authenticates with `{ methodId: "gemini-api-key" }` using the Developer API key path documented for ACP. Benign already-authenticated responses are ignored so cached/env auth keeps working.
- **`agent-platform`:** set `ANTIGRAVITY_ACP_AUTH_METHOD=agent-platform` (with `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION` + Application Default Credentials) for Gemini Enterprise Agent Platform usage.
- You can force a method explicitly with `ANTIGRAVITY_ACP_AUTH_METHOD=oauth-personal|oauth-business|gemini-api-key|agent-platform`.

You are responsible for complying with the Antigravity Terms of Service, quota limits, and any Google policy changes. Every request runs against your real Antigravity account and shares your quota.

---

## Why ACP instead of OAuth / API-proxy plugins?

Plugins like OAuth token extractors or local reverse proxies pull credentials out of local storage and replay private Cloud Code / Antigravity HTTP endpoints with spoofed headers. Combined with automated retry loops on `429` responses, that pattern routinely triggers abuse bans.

This plugin follows the same official-harness architecture used by tools like **T3 Code** and **Zed ACP**:

| Aspect | OAuth / Proxy Plugins | `opencode-antigravity-acp` (Code Mode default, Pure ACP opt-out) |
| :--- | :--- | :--- |
| **Auth & headers** | Extracts OAuth tokens; spoofs IDE/API headers | None — spawns your local signed-in `agy acp` binary directly + official `authenticate` |
| **Protocol** | Unofficial private HTTP API emulation | Official stdio JSON-RPC Agent Client Protocol (`agy acp --stdio --process-per-session`) |
| **Prompt injection** | Raw outer-harness system prompts / tool schemas leak upstream | Zero system injection — `input.system = []`, no `<workspace_tools_bridge>` / `<workspace_context>` (tool schemas never injected; `input.tools` reduced to `question` in Pure ACP opt-out, allowlist preserved in Code Mode default only for `mcp_oc_*` round-trips) |
| **History replay** | Replays foreign model turns verbatim (incl. tool calls) | Never replays tool/reasoning state — cross-model switches send a plain-text-only handoff (`[Historical user/assistant]`, 16k cap) + latest prompt |
| **429 / Quota error handling** | Often retries repeatedly in tight loops | Fail-fast circuit breaker halts on attempt #1 and trips a 60s persisted cooldown |

---

## Features

- **Seamless cross-model & fast same-process switching (T3-Code-style `create_with_handoff`):** switch freely between Antigravity ACP and normal OpenCode models—or between different Antigravity models on the same `agy acp` process—in the same session with no lock-outs and no lost context. Normal ACP-to-ACP flow sends ONLY the raw latest human prompt + image attachments via `buildThinAcpPromptBlocks`. Switching models or returning from normal-model turns starts a fresh `agy acp` session (`session/new`) and restores the earlier conversation via a plain-text-only handoff (`buildTextOnlyHandoffPromptBlocks`: ONLY `[Historical user]` / `[Historical assistant]` text, 16k cap, dropping all reasoning, tool calls, tool results, schemas, todos, approvals) followed by the latest prompt. No tool/reasoning replay, ever. Toggling ACP modes reconnects automatically with the same seamless restore.
- **Code Mode by default + Pure ACP opt-out:** attaches only the single `oc` Code Mode MCP server (`execute`, `subagent`, etc.) with zero prompt injection (switch via the ACP popover: `+ Code Mode` vs `Pure ACP`), and preserves native `acp_*` tool call names in tool results. Pure ACP opt-out uses `mcpServers: []` (zero bridged MCPs, 100% native `agy acp`).
- **Accurate token & context usage reporting:** tracks live `usage_update` context size and per-turn token usage (preserving usage on interrupts and isolating turns cleanly).
- **Robust process & session lifecycle:** process-group teardown, stdio guards, prompt deadlines and `AbortSignal` cancellation, plus session-scoped cleanup when OpenCode sessions are deleted.
- **Explicit ACP `authenticate()` + oauth env scrub:** after `initialize`, the bridge calls official `authenticate` (`oauth-personal` by default, `gemini-api-key` when `GEMINI_API_KEY` is set, or `ANTIGRAVITY_ACP_AUTH_METHOD` override), ignoring benign already-authenticated errors. When spawning `agy acp` for `oauth-personal`, ambient `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` are scrubbed so stray keys never collide with the personal login (kept for `gemini-api-key` / `agent-platform`).
- **Dynamic Live Model & Reasoning Effort Discovery:** Queries `agy acp` (`session/new` `configOptions` + `models.availableModels`), caches the catalog in OpenCode plugin storage (6h TTL, deduplicated across open workspaces), and exposes all models with their individual reasoning efforts (`low`, `medium`, `high`, `xhigh` where supported) without family-collapsing in OpenCode Desktop (`/agy-reload` busts stale language-model caches on reload).
- **Zero Impact on Normal OpenCode Usage:** `McpRelayServer` (only used for Code Mode) and `agy acp` processes start lazily only when an `antigravity-acp/*` model is invoked. Normal OpenCode providers keep full Code Mode and prompt/response paths untouched.
- **Native OpenCode Desktop Controls & Slash Commands:** Compact `ACP` composer popover for switching Approval Modes (`Auto`, `Accept edits`, `Ask`, `Plan`), ACP modes (`+ Code Mode` vs `Pure ACP`), or refreshing models (`/agy-reload`). `/agy-reset` stays available as a background slash command. Selecting an Antigravity model pre-warms `agy acp` in the background, so the status pill moves `Standby` → `Starting...` → `Connected` before you even send the first message.

---

## Safety Guardrails & Honest Risks

### Built-in Guardrails

1. **Zero token extraction / zero spoofing:** Never reads Antigravity auth databases or modifies official `agy` headers or binaries.
2. **Zero outer-harness injection:** Outer `system` instructions are always cleared (`input.system = []`) for ACP models. Pure ACP opt-out reduces `input.tools` to OpenCode's `question` tool, used only to answer `ask_question`; the Code Mode default preserves the `input.tools` allowlist only so `mcp_oc_*` round-trips are permitted (tool schemas are never injected either way). No `appendSystemPrompt` is ever passed to `session/new` / `session/resume`. Only the raw latest human prompt + attachments (or a plain-text-only handoff + latest prompt on model switch) leave OpenCode.
3. **No tool/reasoning replay:** Cross-model switches carry over ONLY plain-text `[Historical user]` / `[Historical assistant]` turns (16k cap). Reasoning, tool calls/results, schemas, todos, and approvals are dropped — Antigravity always owns a clean native session after a switch.
4. **Fail-fast attempt-1 circuit breaker:** Detects upstream API/quota errors (`RESOURCE_EXHAUSTED`, `code 429`, `code 403`, `PERMISSION_DENIED`, `API error (attempt N)`), cancels/kills `agy acp` immediately, trips a persisted 60-second cooldown, and suppresses automatic replay after server restarts.
5. **Clean plugin disable / reload:** Disposing mid-turn terminates the AI SDK stream cleanly without emitting retryable error chunks so OpenCode doesn't enter retry loops.

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
  - `+ Code Mode` *(default)* — Attaches only the single `oc` Code Mode MCP server *(reconnects automatically with conversation preserved, zero prompt injection)*.
  - `Pure ACP` — `mcpServers: []`, zero bridged MCPs, 100% native `agy acp`.
- **Actions & Slash commands:**
  - `/agy-reset` — Disposes and resets the active Antigravity ACP session for the current session (background command).
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
