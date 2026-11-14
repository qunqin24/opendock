# TrustGuard for OpenCode

[NeuralTrust TrustGuard](https://docs.neuraltrust.ai/trustguard/overview) runtime security for the
[OpenCode](https://opencode.ai) coding agent. The plugin sends prompts, tool calls and tool results to
TrustGuard's [`POST /v1/evaluate`](https://docs.neuraltrust.ai/trustguard/api/evaluate) and enforces the verdict
**before** a tool runs — the same logic as the TrustGuard plugins for
[Claude Code](https://github.com/NeuralTrust/trustguard-claude-code-plugin) and
[Cursor](https://github.com/NeuralTrust/trustguard-cursor-plugin).

| OpenCode event | Sent to TrustGuard as | Enforcement |
| --- | --- | --- |
| Before a tool runs (`tool.execute.before`) | `protocol: mcp`, `tools/call` with tool name + arguments, `direction: input` | `block` → tool call fails with a clear error the model sees · `ask` → OpenCode approval prompt (V2) · `transform` → `transform_action` |
| After a tool runs (`tool.execute.after`) | `protocol: mcp`, tool result, `direction: output` | `block` (e.g. indirect prompt injection) → result withheld · `transform` (DLP) → masked result from TrustGuard |
| User prompt (`chat.message` V1 / `session.prompt` V2) | `protocol: llm`, user message, `direction: input` | `block` → prompt is not sent to the model |

Works with **OpenCode V2** (`@opencode/plugin`, `id` + `setup`) and **OpenCode V1 ≥ 1.18.29**
(`@opencode-ai/plugin`, `server()`) from a single package. No runtime dependencies.

## Requirements

- A TrustGuard **collector key** (`tgk_…`). The SaaS base URL `https://trustguard.neuraltrust.ai` is the default. In the NeuralTrust console create a
  collector (Agent Security → Collectors), create its key on **Auth** and assign a policy. See
  [Collectors](https://docs.neuraltrust.ai/trustguard/concepts/collectors).
- OpenCode V2, or OpenCode V1 1.18.29 or newer.

## Install

```sh
# OpenCode V2
opencode plugin add @neuraltrust/opencode-trustguard
```

or add it to `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  // OpenCode V2
  "plugins": ["@neuraltrust/opencode-trustguard"],
  // OpenCode V1
  "plugin": ["@neuraltrust/opencode-trustguard"]
}
```

## Configure

Set the same environment variables used by the other TrustGuard hooks:

```sh
export TRUSTGUARD_API_KEY="tgk_…"                       # collector key (required)
export TRUSTGUARD_DATA_URL="https://trustguard.neuraltrust.ai"   # optional: this is the default (SaaS)
```

| Env var | File key | Default | Meaning |
| --- | --- | --- | --- |
| `TRUSTGUARD_API_KEY` | `api_key` | — | Collector key. **Without it the plugin allows everything** and logs a warning. |
| `TRUSTGUARD_DATA_URL` | `data_url` | `https://trustguard.neuraltrust.ai` | TrustGuard base URL (serves `/v1/evaluate`). Change it only for another region or a self-hosted data plane (see the collector's **Connection** tab). |
| `TRUSTGUARD_FAIL_MODE` | `fail_mode` | `open` | When TrustGuard is unreachable, times out or returns non-200: `open` allows, `closed` denies. |
| `TRUSTGUARD_TRANSFORM_ACTION` | `transform_action` | `ask` | How a `transform` verdict on a tool call is applied: `ask`, `deny` or `allow`. |
| `TRUSTGUARD_TIMEOUT_MS` | `timeout_ms` | `5000` | Timeout for each evaluate call. |
| `TRUSTGUARD_CONSUMER_ID` | `consumer_id` | — | Optional `consumer_id` sent with every evaluation. |
| — | `report_notice` | `true` | Log report-only findings. |
| — | `max_content_bytes` | `262144` | Tool output is truncated to this size before evaluation. |
| — | `events` | all on | Disable events, e.g. `{ "tool.execute.after": false }` (`tool.execute.before`, `tool.execute.after`, `chat.message`). |

Values resolve as **env > plugin options > user file > managed file > default**:

- Plugin options: `{ "package": "@neuraltrust/opencode-trustguard", "options": { "fail_mode": "closed" } }` (V2) or
  `["@neuraltrust/opencode-trustguard", { "fail_mode": "closed" }]` (V1).
- User file: `~/.trustguard/opencode.json` (override with `TRUSTGUARD_OPENCODE_CONFIG`).
- Managed file (MDM): `/etc/trustguard/opencode.json`, `/Library/Application Support/TrustGuard/opencode.json` or
  `%ProgramData%\TrustGuard\opencode.json` (override with `TRUSTGUARD_OPENCODE_SYSTEM_CONFIG`). When it contains an
  `api_key`, the `api_key`, `data_url` and `fail_mode` it sets cannot be overridden by the developer.

```json
{
  "data_url": "https://trustguard.neuraltrust.ai",
  "api_key": "tgk_…",
  "fail_mode": "closed"
}
```

## Verdicts

| TrustGuard status | Tool call | Tool result | Prompt |
| --- | --- | --- | --- |
| `allow`, `skip` | runs | unchanged | sent |
| `report` | runs (finding logged) | unchanged | sent |
| `transform` | `transform_action` (default `ask`) | replaced with TrustGuard's masked text, or withheld | sent |
| `ask` | V2: OpenCode approval prompt · V1: blocked (V1 plugins cannot prompt) | unchanged (ask gates do not apply to output) | sent |
| `block` | fails with `TrustGuard blocked this action: <reason>` | withheld, model told to treat it as untrusted | not sent |

On V2 the `ask` prompt is a regular OpenCode permission request with action `trustguard`; `opencode run --auto`
auto-approves it, and non-interactive runs reject it.

## Logging

Messages are prefixed with `trustguard-opencode:` (OpenCode V1: via the app log, service `trustguard-opencode`;
V2: stderr / server log). Only the verdict, the status and the `trace_id` are logged, never content.

## Develop

```sh
npm install
npm run build
npm test        # node:test with a mocked fetch, no network
npm pack --dry-run
```

Load a local build in OpenCode V2 by pointing `plugins` at the package directory
(`"plugins": ["/path/to/trustguard-opencode-plugin"]`); in V1 re-export it from
`.opencode/plugin/trustguard.js`: `export { default } from "@neuraltrust/opencode-trustguard"`.

## Release

CI (`.github/workflows/ci.yml`) typechecks, builds and tests every pull request and push to `main` on Node 20
and 22. Pushing a tag `vX.Y.Z` that matches `package.json` runs `.github/workflows/release.yml`, which publishes to npm
with `npm publish --provenance --access public` through npm trusted publishing (OIDC, `id-token: write`); no npm
token is stored. Configure the trusted publisher on npmjs.com (repository `NeuralTrust/trustguard-opencode-plugin`,
workflow `release.yml`, environment `npm`) before the first tag.

## License

Apache-2.0
