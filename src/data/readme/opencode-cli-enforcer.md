<p align="center">
  <img src="docs/assets/logo.svg" alt="opencode-cli-enforcer" width="120" />
</p>

<h1 align="center">opencode-cli-enforcer</h1>

<p align="center">
  <strong>Claude Code as a first-class OpenCode v2 model provider</strong><br>
  <em>Use a Claude subscription (no API key) while OpenCode keeps full ownership of tools, permissions, and session history.</em>
</p>

<p align="center">
  <a href="https://github.com/lleontor705/opencode-cli-enforcer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/runtime-node%20%E2%89%A520-brightgreen" alt="Node >= 20" />
</p>

---

## What this plugin is

`opencode-cli-enforcer` is an **OpenCode v2 plugin** that registers Claude Code as a first-class model
provider through `@anthropic-ai/claude-agent-sdk`. It publishes the provider id **`claude-bridge`**
and a static catalog of Claude Code models, so a user with a Claude subscription can select
`claude-bridge/*` models and generate text **without an `ANTHROPIC_API_KEY`** — authentication is
delegated to the Claude Code CLI the SDK drives.

The design principle is a strict separation of duties:

- **OpenCode is the sole tool executor.** The bridge never runs tools itself. Claude Code only
  *requests* tools, and every request is routed back to the OpenCode host, which validates, approves,
  executes, and returns the result.
- **OpenCode keeps its own session history, permissions, and compaction.** Claude Code runs as a
  generation backend behind a parked SDK query; it is never given authority over the workspace.

Everything provider-specific lives behind seven provider-agnostic seams, so the second provider —
the Google Antigravity CLI (`agy`) — ships as configuration rather than a rewrite. See
[Architecture overview](#architecture-overview) and the [agy provider note](#google-antigravity-agy-wave-b-shipped).

## Requirements

- **Node.js >= 20** (the plugin is ESM-only; `package.json` declares `"type": "module"`).
- **OpenCode v2** with plugin API `@opencode/plugin` `2.x`.
- **Claude Code CLI** installed and authenticated with a subscription on the same machine. The
  bridge spawns it through the Agent SDK; it does not ship the CLI.
- **Google Antigravity CLI (`agy`) — required only for the `agy` provider.** Install it and
  authenticate once so it caches its OAuth credentials
  (`~/.gemini/antigravity-cli/antigravity-oauth-token`). The bridge drives `agy` headless over its
  documented stream-json protocol and does not ship the CLI.
- A local workspace. Remote / non-local workspaces are out of scope for v1.

## Install and registration

OpenCode v2 discovers plugins from the `plugins` array in `opencode.jsonc`. Each entry is an object
with a `package` and an optional `options` object; the options object is exposed to the plugin as
`ctx.options`.

Register the published npm package:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-cli-enforcer",
      "options": {
        "providers": {
          "claude": { "enabled": true }
        },
        "defaultProvider": "claude"
      }
    }
  ]
}
```

Or register a local checkout directly by path (useful for development):

```jsonc
{
  "plugins": [
    {
      "package": "file:/absolute/path/to/opencode-cli-enforcer",
      "options": {}
    }
  ]
}
```

With no `options`, the plugin runs with safe defaults: the `claude` provider is enabled, the `agy`
provider is disabled, and `defaultProvider` is `claude`. Restart OpenCode (or reload plugins) after
editing `opencode.jsonc`. The plugin then registers via
`Plugin.define({ id: "claude-bridge", setup })` and adds the provider and its model catalog through
`ctx.provider.transform`, idempotently (a hot reload never duplicates records).

## Quick start

1. Install and authenticate the Claude Code CLI for your user (subscription login, no API key).
2. Add the plugin entry shown above to `opencode.jsonc`.
3. Restart OpenCode.
4. Select a model from the **`claude-bridge`** provider, for example `claude-bridge/claude-sonnet-5`.
5. Send a prompt. Tool calls made by the model are executed by OpenCode; approvals and permission
   prompts behave exactly as they do for any other provider.

The catalog is a static projection (the Agent SDK exposes no enumerable model list). It includes the
`fable`, `opus`, `sonnet`, and `haiku` families; 1M-context variants are requested only for model ids
measured to serve them, and dated snapshot ids are never exposed. See
[docs/config.md](docs/config.md) for the full configuration reference.

To use the Google Antigravity provider instead, install and authenticate the `agy` CLI, acknowledge
its four constraints, set `providers.agy.enabled` to `true`, and optionally set `defaultProvider` to
`"agy"`. See the [agy provider note](#google-antigravity-agy-wave-b-shipped).

## Architecture overview

The bridge is built from seven **provider-agnostic Layer-1 seams** (`src/provider/seams.ts`). No
provider-specific type appears in any seam signature; the provider registry
(`src/provider/registry.ts`) is the only place that binds a provider id to implementations.

| Seam | Responsibility |
|---|---|
| `CliTransport` | Spawn the backend CLI, build argv, write stdin NDJSON, read stdout lines, capture stderr, map exit codes, and arm a per-turn watchdog. |
| `EventMapper<Raw, Normalized>` | Translate native events to the normalized `TurnResult{status, text, usage, sessionId}`. **Usage normalization happens here** (Claude is per-message; cumulative-per-session counters are converted to turn deltas at this seam). |
| `SessionStore` | Opaque, provider-neutral conversation handle `{provider, conversationRef}`. Core never parses a provider's storage format. |
| `ToolChannel` | Register host tools with the backend (Claude: in-process MCP server). |
| `PermissionPolicy` | Capability-honest `supportsInteractiveApproval` flag. |
| `SteeringPolicy` | Capability-honest `supportsMidTurnSteer` flag. |
| `ProviderProbe` | Detect, version, and health-check a provider. |

**Parked query + in-process MCP handshake.** One Agent SDK `query()` is spawned per OpenCode
session and kept parked for the life of that session. Its `prompt` is an ack-carrying async iterable
(`src/provider/prompt-stream.ts`), so a new turn writes into the live stream instead of respawning
the child. Host tools are served to Claude Code over an in-process MCP server
(`src/mcp/server.ts`); each `tools/call` is paired to its result by Claude's own `tool_use` id
(`src/mcp/rendezvous.ts`, order-tolerant, two-map), and OpenCode's tool results are delivered back
into the rendezvous on the next step. A mid-turn steer is written to Claude's stdin and acknowledged
**before** any tool result is delivered, so the steer is observed at the next tool boundary rather
than degrading into a follow-up turn.

**Session mirror (REUSE / REBUILD).** The OpenCode conversation is mirrored into Claude Code's
`~/.claude/projects` JSONL so the same session can be reopened in the `claude` CLI and vice versa.
A per-session state machine (`src/session/mirror.ts`) chooses one of four transitions each turn —
`reuse`, `clean-start-preserve`, `clean-start`, or `rebuild` — plus a `force-rotate` after an abort.
Host history rewrites (compaction, revert) mark the mirror for rebuild; the full-file rewrite
preserves the Claude Code session id, re-materializes `@file` attachment expansions at stable
ordinals, and is gated by a fail-closed post-write integrity check (`src/session/verify.ts`): a
mirror the bridge cannot re-read is treated as a failed write, never resumed.

**Isolated compaction lane.** OpenCode remains the sole compactor. When the host requests
compaction, the bridge answers it with a throwaway one-off summarizer query
(`src/session/compaction.ts`) that shares nothing with the session's parked query or mirror:
`persistSession: false`, `maxTurns: 1`, `tools: []`, and every filesystem settings/skill/memory
source disabled, with the same scrubbed child environment. If the lane fails, it leaves the host
result unset so OpenCode falls back to its own compaction — a failure never aborts the request.

**Error taxonomy.** Every surfaced error is classified into exactly one closed category with a
stable, append-only code (`src/errors/taxonomy.ts`): `config`, `transport`, `tool`, `stream`,
`rate-limit`, and `session-mirror`. Unsendable prompts fail loud before they reach the child
(`assertSendablePrompt`) rather than silently degrading.

**Teardown and leak assertions.** Abort signals, backend child exit, and normal turn end all funnel
through a single teardown path (`src/errors/teardown.ts`): interrupt/close the SDK query, fail the
prompt stream so queued **and** in-flight acks settle, resolve every parked MCP handler with a text
result (never reject — a rejected handler would strand Claude's `tools/call` forever), force-rotate
the mirror, and clear per-query state. A fail-loud leak scan then asserts no dangling query, pending
handler, unended stream, or unreleased context remains.

## Capability matrix

| Capability | `claude` (Wave A) | `agy` (Wave B, shipped) |
|---|---|---|
| Provider / models registered | Yes — static Claude Code catalog | Yes — static Antigravity catalog |
| Auth | Claude subscription via Claude Code CLI | Antigravity CLI cached OAuth credentials |
| Reasoning / thinking stream | Yes | **No** — `thinking_tokens` are counted, but there is no text stream |
| Partial tool input | Yes (streamed) | **No** — the whole tool call arrives at the step's `DONE` |
| Streaming granularity | Token-level | **Step-level** — one `ACTIVE`/`DONE` pair per step |
| Tool execution | OpenCode host executes; in-process MCP rendezvous | OpenCode host executes; out-of-process stdio MCP runner + loopback bridge |
| Interactive approval (`supportsInteractiveApproval`) | **Yes** | **No** — declarative `settings.json` allow-rules / MCP-side enforcement |
| Mid-turn steering (`supportsMidTurnSteer`) | **Yes** — acked stdin steer at tool boundaries | **No** — steering is queued to the next turn boundary |
| Session resume | Yes — REUSE/REBUILD `~/.claude/projects` JSONL mirror | Yes — opaque `conversationRef` resumed with `--conversation`; clean-start on history divergence (no rebuild / force-rotate) |
| Usage accounting | Per-message | Cumulative-per-session, normalized to per-turn deltas at the seam |
| Constraint acknowledgment gate | `child-env-hygiene`, `session-mirror-rebuild-cost` (acknowledged by default) | Four constraints; **all must be acknowledged before enablement** |

Missing capabilities degrade **by policy**, not by accident: the honest seam flags let the core
downgrade an unsupported interaction instead of assuming it silently.

## Configuration

Full reference: **[docs/config.md](docs/config.md)**. It documents every option, its default,
fail-closed validation semantics, the per-provider acknowledgment gate, `CLAUDE_CONFIG_DIR`
behavior, and child-environment hygiene. The short version:

- `providers.claude` — `enabled`, `modelOverride`, `debugLogs`, `toolsAllow`, `acknowledgedConstraints`.
- `providers.agy` — `enabled`, `acknowledgedConstraints`, `dangerouslySkipPermissionsConsent`. Enabling
  it starts the host-tool loopback runner; user-level `agy mcp add` registration stays opt-in.
- `defaultProvider` — `"claude"` (default) or `"agy"`.
- Child-env hygiene: the backend child receives `ENABLE_CLAUDEAI_MCP_SERVERS=0`,
  `DISABLE_AUTO_COMPACT=1`, and every `ANTHROPIC_*` variable scrubbed.

## Operator Actions

These are the actions an operator (not the plugin) is responsible for.

1. **Install and authenticate the Claude Code CLI.** The bridge requires a working, subscription-
   authenticated `claude` CLI on the same machine. No API key is stored by the plugin.
2. **Install and authenticate the `agy` CLI for the `agy` provider.** The `agy` provider requires a
   discoverable `agy` binary with cached credentials. Run `agy` once to complete OAuth login; the
   bridge only checks that the cached token file exists and never reads it.
3. **Keep `ANTHROPIC_*` out of the OpenCode server environment.** Never export `ANTHROPIC_API_KEY`
   (or any `ANTHROPIC_*` variable) into the environment that launches OpenCode. An exported key
   would hijack the child CLI's subscription auth. The bridge scrubs `ANTHROPIC_*` from the child
   environment as defense in depth, but the operator must not rely on that scrub alone.
4. **Choose the session-mirror location via `CLAUDE_CONFIG_DIR`.** Set `CLAUDE_CONFIG_DIR` to move
   the `~/.claude` root (and therefore the mirrored `projects/` JSONL). When unset, the bridge uses
   `~/.claude`. The same variable is honored by the `claude` CLI, so both sides see the same files.
5. **Complete the acknowledgment gate before enabling a provider.** Enabling a provider whose
   constraint register is not fully acknowledged throws a config error and registers nothing. Claude
   is acknowledged by default; `agy` requires the explicit [acknowledgment gate](#acknowledgment-gate).
6. **Opt in before mutating agy's user-level MCP config.** Registering the host-tool runner with
   `agy mcp add` writes machine-global config (`~/.gemini/config/mcp_config.json`); the bridge keeps
   this off by default and only performs it under explicit operator opt-in.
7. **Reopen mirrored sessions in the `claude` CLI (optional).** Because the mirror lands in the
   standard Claude Code project store, the same conversation can be opened from either side.
8. **Know the integration environment gates (development / CI).** The integration suites are opt-in:
   `CLAUDE_BRIDGE_INTEGRATION=1` enables the Wave A live-CLI oracle (the CI integration job is gated on
   the repository variable of the same name), `AGY_BRIDGE_INTEGRATION=1` enables the Wave B `agy`
   live-CLI oracle, and `AGY_BRIDGE_RECORD=1` enables quota-spending fixture recording. Each gate skips
   cleanly when unset; none is set by the plugin at runtime.

### Acknowledgment gate

The configuration carries a per-provider enablement map with an explicit acknowledgment gate. Each
provider has a **constraint register**; enabling it requires acknowledging every constraint id in
that register, otherwise setup fails closed with a config error that names the missing
acknowledgments.

- **`claude` register** (acknowledged by default): `child-env-hygiene`, `session-mirror-rebuild-cost`.
- **`agy` register** (all four required to enable): `tos-third-party-access-ambiguity`,
  `fatal-control-frames`, `no-mid-turn-steer`, `auto-allowed-workspace-writes`.

```jsonc
{
  "providers": {
    "agy": {
      "enabled": true,
      "acknowledgedConstraints": [
        "tos-third-party-access-ambiguity",
        "fatal-control-frames",
        "no-mid-turn-steer",
        "auto-allowed-workspace-writes"
      ]
    }
  }
}
```

The `agy` ToS constraint is an explicit operator legal-risk decision. Enabling a provider is an
assumption of risk by the operator running the plugin; the plugin only *enforces* the gate, it does
not interpret any terms or grant permission. See
[docs/agy-tos-acknowledgment.md](docs/agy-tos-acknowledgment.md).

## Google Antigravity (`agy`) — Wave B (shipped)

The `agy` provider adapts the Google Antigravity CLI behind the **same seven seams** as `claude`, so
it is a configuration-level addition rather than a second code path. What began as the planned Wave B
adapter now ships, gated by the Terms-of-Service acknowledgment above. Its constraint register
records why the seams are capability-honest rather than Claude-shaped:

- `tos-third-party-access-ambiguity` — Google Antigravity Additional Terms leave programmatic
  third-party access ambiguous (Google AI Developer Forum threads `185992`, `186954`, `185494`,
  `186952`, `187241`). Enabling `agy` is an operator risk decision.
- `fatal-control-frames` — in-stream `control_request`/`control_response` frames and slash commands
  are fatal to the child (exit `2`); only `user` message events may be written to stdin.
- `no-mid-turn-steer` — `agy` cannot be steered mid-turn; steering is queued to the next turn
  boundary.
- `auto-allowed-workspace-writes` — `agy` auto-allows workspace writes by default; enforcement
  relies on declarative allow-rules and explicit `--dangerously-skip-permissions` consent.

All four must be acknowledged before `providers.agy.enabled` may be `true`, exactly as in the
[acknowledgment gate](#acknowledgment-gate) above.

### Honest capability downgrades

| Capability | `agy` behavior |
|---|---|
| Reasoning stream | None. `thinking_tokens` are counted in usage, but there is no thinking text stream. |
| Partial tool input | None. The complete tool call arrives in one `tool_info` block at a step's `DONE`. |
| Streaming granularity | Step-level, not token-level. |
| Mid-turn steering | Not supported. Steering is queued and delivered at the next turn boundary. |
| Interactive approval | Not supported. Permissions are declarative. |
| Session mirror | No REUSE/REBUILD JSONL mirror. The conversation is resumed by opaque id; a history divergence clean-starts. |

### Host tools through the stdio MCP runner

`agy` cannot call back into a parked in-process handler, so host tools reach it through a spawned
stdio MCP server. The plugin runs a loopback HTTP bridge bound to `127.0.0.1` with a per-process
bearer token, and the runner (`src/agy/runner.ts`) is a stdio MCP child that forwards `tools/list`
and `tools/call` to that bridge. The runner is what `agy` spawns, so the tool schemas and the
fail-closed permission checks are exactly the same server the `claude` path uses — the hop adds no
second tool surface and the bridge is never routable beyond loopback.

### Registration, permissions, and resume accounting

- **Declarative permissions.** With `supportsInteractiveApproval = false`, `agy` enforces a
  `settings.json` allow list plus MCP-side denial. A tool absent from the allow list is denied at the
  MCP boundary rather than silently executed. The `--dangerously-skip-permissions` bypass is emitted
  only under explicit operator consent (`providers.agy.dangerouslySkipPermissionsConsent`).
- **User-level MCP registration is opt-in.** Registering the runner with `agy mcp add` mutates
  machine-global user config (`~/.gemini/config/mcp_config.json`), so it defaults to a dry-run
  manifest and only runs when the operator explicitly opts in.
- **Resume accounting.** `agy` reports cumulative-per-session usage. The bridge keeps the last
  cumulative total per conversation out of band and seeds the mapper before a resume, so a resumed
  turn reports only its own delta and never re-counts the session. See
  [docs/config.md](docs/config.md#agy-provider).

## Development

```sh
npm install
npx tsc --noEmit                          # typecheck src/
node --import tsx --test tests/**/*.test.ts   # run the unit test suite
```

## License

MIT. See [LICENSE](LICENSE).
