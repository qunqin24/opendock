<div align="center">

# 🔥 kiro-bed-warmer

**One warm `kiro-cli` for every OpenCode window and subagent.**

A local daemon that keeps `kiro-cli acp` hot and serves it as an OpenAI-compatible provider,<br/>
so Kiro models start fast and stalls fall back to another model instead of hanging.

[![Node](https://img.shields.io/badge/node-%E2%89%A5%2024-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![OpenCode](https://img.shields.io/badge/opencode-1.18.x-111111)](https://opencode.ai)
[![Platform](https://img.shields.io/badge/platform-macOS-000000?logo=apple&logoColor=white)](#requirements)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](#development)
[![Tests](https://img.shields.io/badge/tests-56%20unit%20%2B%202%20integration-brightgreen)](#development)

[Quick start](#quick-start) · [Benchmarks](#benchmarks) · [Configuration](#configuration) · [How it works](#how-it-works) · [Security](#security) · [Troubleshooting](#troubleshooting)

</div>

---

## Why

The stock Kiro bridge for OpenCode starts a fresh `kiro-cli` for every window, every subagent and every toolless call. It also runs `settings` and `whoami` before each spawn and calls `session/load` on every new message. That startup cost comes back many times per session.

kiro-bed-warmer pays that cost **once**:

- **Warm.** One long-lived `kiro-cli acp` process, with a spare session already created for each working directory.
- **Shared.** Every window and every subagent uses it.
- **Fail-fast.** A silent Kiro stall becomes a retryable `503`, so omo's `runtime_fallback` can move the step to another model.

> [!NOTE]
> This removes overhead around the model. It does not make the model faster. In real use, bridge overhead was about 3 of 66 minutes.

## Benchmarks

Measured with `kiro-bed-warmer bench` on `claude-haiku-4.5`, medians of 3 runs, both providers through real `opencode run`:

| Scenario | `kiro` | `kiro-warm` | Saved |
|---|---:|---:|---:|
| New window: `opencode run` wall time | 15.77 s | **8.43 s** | −7.3 s |
| New window: user message → first output | 13.57 s | **6.36 s** | −7.2 s |
| Subagent: user message → first output | 5.87 s | **1.47 s** | −4.4 s |
| New message, turns 2–4 | 1.78 s | **1.34 s** | −0.4 s |
| New message, last 3 of 50 turns | 1.51 s | **1.16 s** | −0.35 s |
| Tool result → next step output | 1.33 s | 1.31 s | — (model-bound) |

The per-message saving grows with history, because live sessions are never `session/load`ed. The benchmark used one-word turns, so real sessions save more than this table shows.

## Features

- ⚡ **Pre-warmed sessions.** The plugin creates a spare session for a window's directory as soon as it loads.
- 🧵 **Live session routing.** OpenCode sessions map to live Kiro sessions, and only the new user message is sent.
- 🛠️ **Native tool calls.** Kiro's MCP calls stream out as OpenAI `tool_calls`. Calls are batched over 100 ms, so parallel calls arrive in a single step.
- 🧯 **Stall guard.** If Kiro is silent for longer than `KBW_STALL_SECONDS`, the step fails with a retryable `503`.
- 🔁 **Self-healing.** Reverts, edits, compaction, forks, daemon restarts and kiro-cli crashes all rebuild the Kiro session from history.
- 🔒 **Local only.** The daemon listens on `127.0.0.1` only, and every route needs a bearer token.
- 🧹 **Leaves your repos alone.** It writes no `.kiro/agents` files into your projects and loads none of your Kiro MCP config.
- 📊 **Observable.** JSON-lines logs, a `/metrics` endpoint, and a `--debug` mode that times every ACP call.

## Compliance by design

kiro-bed-warmer talks to Kiro **only through `kiro-cli acp`**, using the default v2 engine. It does **not**:

- call Kiro or CodeWhisperer HTTP APIs directly,
- read, copy or refresh kiro-cli tokens or its SQLite store,
- spoof IDE headers.

Authentication stays with `kiro-cli`.

## Requirements

| | |
|---|---|
| OS | macOS (uses `/usr/bin/nc -U`; a Node relay is used if it's missing) |
| Runtime | Node **≥ 24**. The TypeScript sources run directly via type stripping, so there is no build step. |
| Kiro | `kiro-cli` on `PATH` and logged in (`kiro-cli login`) |
| OpenCode | **1.18.x** (plugin API v1) |
| Optional | oh-my-openagent (omo) ≥ 4.19 for stall fallback |

## Quick start

### 1. Add the plugin

Add one line to `~/.config/opencode/opencode.json`. OpenCode installs the package on next start:

```jsonc
{
  "plugin": [
    // keep your existing plugins
    "kiro-bed-warmer@0.1.0"
  ]
}
```

The plugin registers the `kiro-warm` provider with every model kiro-cli offers (context limits, tool calls and, for Claude models, image input). Node ≥ 24 must be on `PATH`, because the daemon runs under Node.

### 2. Optional: override models

Add a `provider.kiro-warm` block only to rename models or change fields. Your fields win, and anything you leave out is filled in:

```jsonc
{
  "provider": {
    "kiro-warm": {
      "models": {
        "claude-opus-5.5": { "name": "Opus (warm)", "limit": { "output": 16000 } }
      }
    }
  }
}
```

<details>
<summary><b>Running from a git checkout instead</b></summary>

```sh
git clone https://github.com/Dakuaisu/kiro-bed-warmer.git ~/kiro-bed-warmer
cd ~/kiro-bed-warmer
npm ci          # local devDependencies only, nothing global
```

Then use `"file://<ABSOLUTE_PATH>/plugin/kiro-warm.ts"` as the plugin entry. The checkout runs the TypeScript sources directly.

</details>

### 3. Run

```sh
opencode run -m kiro-warm/claude-sonnet-4.5 "hello"
```

That's it. The plugin starts the daemon when first needed and injects the token **in memory**, so the token is never written to `opencode.json`. The daemon exits after 2 hours idle.

<details>
<summary><b>Available models</b></summary>

Any model kiro-cli offers can be added. Run `GET /v1/models` or `bin/kiro-bed-warmer status` for the current list:

`auto` `claude-opus-5.5` `claude-sonnet-5.5` `claude-opus-5` `claude-sonnet-5` `claude-opus-4.8` `gpt-5.6-sol` `gpt-5.6-terra` `gpt-5.6-luna` `claude-opus-4.7` `claude-opus-4.6` `claude-sonnet-4.6` `claude-opus-4.5` `claude-sonnet-4.5` `claude-haiku-4.5` `deepseek-3.2` `minimax-m2.5` `minimax-m2.1` `glm-5` `qwen3-coder-next`

</details>

<details>
<summary><b>Running without the plugin</b></summary>

1. Start the daemon yourself:

   ```sh
   bin/kiro-bed-warmer start
   ```

2. Set the provider's `options.apiKey` to the output of:

   ```sh
   bin/kiro-bed-warmer token
   ```

Without the plugin's cwd header, the daemon reads `Working directory:` from OpenCode's system prompt instead.

</details>

> [!TIP]
> `kiro-warm` works alongside the existing `kiro` provider (`opencode-kiro`), so you can A/B them in the same setup.

## Stall fallback with omo

Without fallback configured, a Kiro stall surfaces as a failed step. With omo's `runtime_fallback` enabled, the failed step is retried on the next model in your chain. In tests, this happened within about 10 ms, and the answer landed in the same session.

Add this to `~/.omo/omo.jsonc`:

```jsonc
"runtime_fallback": {
  "enabled": true,
  "retry_on_errors": [429, 500, 502, 503, 504],
  "max_fallback_attempts": 2
},
"agents": {
  "sisyphus": {
    "model": "kiro-warm/claude-opus-5.5",
    "fallback_models": ["anthropic/claude-opus-5-5", "kiro/claude-opus-5.5"]
  }
}
```

> [!IMPORTANT]
> `model_fallback: true` alone is **not enough**. In tests, omo marked a fallback as pending but never retried it.
>
> omo picks the fallback target from the agent's `fallback_models` chain. Keep `KBW_STALL_SECONDS` at or below omo's `timeout_seconds` (default 30), so the daemon's `503` arrives first.

## Configuration

All settings are environment variables:

| Variable | Default | Description |
|---|---|---|
| `KBW_PORT` | `47900` | HTTP port on `127.0.0.1` |
| `KBW_STATE_DIR` | `~/.local/state/kiro-bed-warmer` | Token, lock, logs and sockets |
| `KBW_STALL_SECONDS` | `30` | Seconds of ACP silence before a retryable `503` |
| `KBW_TOOL_TIMEOUT_MINUTES` | `45` | Maximum wait for OpenCode to return tool results |
| `KBW_IDLE_SHUTDOWN_MINUTES` | `120` | Daemon exits after this much idle time |
| `KBW_SESSION_IDLE_MINUTES` | `180` | Idle Kiro sessions are dropped after this |
| `KBW_MAX_SESSIONS_PER_PROCESS` | `24` | Sessions per `kiro-cli` before another process is spawned |
| `KBW_SPARE_CWDS` | `4` | Directories that get a pre-warmed spare session |
| `KBW_TOOL_BATCH_MS` | `100` | Window for batching parallel tool calls into one step |
| `KBW_TOOLS_READY_SECONDS` | `10` | Wait for kiro to register a request's tools before prompting (twice, with a re-list nudge); then a retryable `503` |
| `KBW_ENGINE` | `v2` | `v2` or `v3` ACP engine (v3 was slower in testing) |
| `KBW_ON_SYSTEM_CHANGE` | `redeliver` | `redeliver` or `reset` when the system prompt changes |
| `KBW_DEBUG` | — | `1` logs every ACP method with timings |

## CLI

```sh
bin/kiro-bed-warmer start [--foreground] [--debug] [--warm <cwd>]
bin/kiro-bed-warmer stop
bin/kiro-bed-warmer status
bin/kiro-bed-warmer token
bin/kiro-bed-warmer bench [--providers kiro,kiro-warm] [--model claude-haiku-4.5] [--runs 3] [--turns 50]
```

## HTTP API

Every route needs `Authorization: Bearer <token>`.

| Route | Purpose |
|---|---|
| `POST /v1/chat/completions` | OpenAI chat completions with streaming (SSE) and tool calls |
| `GET /v1/models` | Models offered by kiro-cli |
| `POST /v1/warm` | Pre-warm a spare session for a directory |
| `GET /health` | Liveness check |
| `GET /metrics` | Spare hits, deltas, continuations, resets by reason, credits, context % |

## How it works

```text
 opencode window / subagent
   │  plugin: token · x-kbw-cwd · pre-warm
   │  OpenAI chat/completions (SSE, tools)
   ▼
 ┌──────────────── kiro-bed-warmer · 127.0.0.1:47900 ────────────────┐
 │ router   opencode session ──▶ live kiro session                   │
 │ pool     warm kiro-cli acp  + spare session per cwd               │
 │ bridge   per-session MCP over a 0700 unix socket (nc -U)          │
 │ turn     tool batching · suspended turns · stall guard            │
 └───────────────────────────────────────────────────────────────────┘
   │  ACP JSON-RPC (stdio)
   ▼
 kiro-cli acp (v2)
```

<details>
<summary><b>Request lifecycle in detail</b></summary>

- **Session key.** The daemon keys sessions on the `x-session-affinity` header that OpenCode sends. Subagents also send `x-parent-session-id`. Toolless calls get their own key.
- **New user turn.** If the incoming history is the known history plus new user messages, only the new messages go to `session/prompt`.
- **Tool calls.** MCP calls are batched and streamed out with `finish_reason: tool_calls`. The ACP turn stays suspended until the next request brings the `role: tool` results.
- **Edits and divergence.** Revert, edit, compaction, fork or an unknown session starts a fresh pooled session. It is seeded with a compact transcript of the history, including tool calls and results, and the event is logged as `router.diverged`.
- **Fingerprints.** History matching tolerates plugin rewrites of earlier user messages (omo injects reminders) and OpenCode pruning old tool output. The last user message is compared exactly, so an edited resend is never dropped.
- **System prompt.** It is sent as `<system_instructions>` with the first prompt. It is sent again when it really changes, after Kiro compacts, and once each time context usage crosses 70 %.
- **Abort.** A client disconnect sends `session/cancel` and fails any pending tool calls. If Kiro doesn't confirm the cancel within 5 s, the session is rebuilt.
- **Crash.** When kiro-cli exits, its sessions are marked dead and the pool respawns and re-warms. The router rebuilds the session on the next request.
- **Auth.** There is no `whoami` call on the hot path. An ACP auth error returns HTTP `401` telling you to run `kiro-cli login`.

</details>

## Security

> [!WARNING]
> The bearer token protects against other local services and the browser. It is **not** a boundary between processes running as your user.

- The daemon binds to **127.0.0.1 only**, and **every route, including `/health`,** needs the bearer token. Tokens are compared in constant time.
- The token is 32 random bytes in `<state>/token` (file mode `0600`, directory `0700`). Any process running as your user can read it, just as it can read kiro-cli's own credentials.
- Each Kiro session gets its own MCP bridge socket. Permission requests are auto-approved **only** for that bridge's `@oc/<tool>` tools; everything else is rejected. OpenCode runs the tools under its own permission rules.
- kiro-cli's built-in tools are disabled (`tools: []`), and your Kiro MCP config is not loaded (`includeMcpJson: false`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| HTTP `401` "run `kiro-cli login`" | Your Kiro session expired. Run `kiro-cli login`. |
| Daemon won't start | Port 47900 may be taken. Set `KBW_PORT` and update the provider's `baseURL` to match. |
| Stalls fail instead of falling back | Enable omo `runtime_fallback` (see [Stall fallback with omo](#stall-fallback-with-omo)). |
| Something looks wrong | Check `bin/kiro-bed-warmer status`, then `<state>/daemon.log`. For timings, restart with `--debug`. |

## Known limits

- **Estimated token counts, no cost.** kiro-cli reports only context usage %, so the daemon derives `usage` from it: total = % × the model's context window (sent by the plugin), output ≈ streamed characters / 4. OpenCode's context meter therefore matches Kiro's. Cost stays $0: Kiro bills credits, not per-token prices. Credits are in the final SSE chunk (`kiro` field) and in `/metrics`.
- **Unwarmed directories.** The first message in a directory the plugin hasn't pre-warmed pays one `session/new`, about 0.3 s.
- **Session files.** kiro-cli keeps its own session files in `~/.kiro/sessions/`, as the existing provider does.
- **No launchd agent.** The daemon starts on demand and exits when idle.
- **Unpinnable provider package.** `@ai-sdk/openai-compatible` is bundled inside the OpenCode binary, so pinning it means pinning OpenCode.

## Development

```sh
npm run check              # tsc (strict) + biome + 56 unit tests against a fake kiro-cli
npm run test:integration   # 2 tests against real kiro-cli on claude-haiku-4.5
```

- The unit tests cover history diffing, tool mapping, batching, stalls, abort, crash recovery, auth errors, and a regression test for each fixed bug.
- Tests run in `/private/tmp/kbw-*` and clean up after themselves. That includes only the kiro session files whose cwd is under those directories.

<details>
<summary><b>Design decisions</b></summary>

- **Node 24 instead of Bun.** Type stripping runs the `.ts` files directly, and it needs no global install.
- **Unix-socket MCP bridge instead of HTTP MCP.** kiro's HTTP MCP transport dropped tool calls after about 120 s. The socket held a call for at least 200 s and keeps tool sets isolated per session.
- **Re-deliver instead of reset on system prompt changes.** OpenCode lists skills in a different order in each process, so resetting on change reset every multi-process session.

</details>

<div align="center">
<sub>Built for people who'd rather wait on the model than on the plumbing.</sub>
</div>