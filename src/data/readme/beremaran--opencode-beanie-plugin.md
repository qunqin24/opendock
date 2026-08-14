# opencode-beanie-plugin

A batteries-included plugin for [OpenCode](https://opencode.ai) that merges eight productivity features into a single package: agent orchestration, subagent throttling, persistent goals, OpenAI-compatible provider auto-configuration, MCP tool aggregation, skill discovery, tool-usage directives, and self-configuration. It also includes an optional TUI companion.

This plugin consolidates six previously separate projects — [mcp-skillbox](https://github.com/beremaran/mcp-skillbox), [agent-toolbox](https://github.com/beremaran/agent-toolbox), [opencode-subagent-throttle](https://github.com/beremaran/opencode-subagent-throttle), [opencode-agent-tree](https://github.com/beremaran/opencode-agent-tree), [opencode-openai-compatible-auto-configure](https://github.com/beremaran/opencode-openai-compatible-auto-configure), and [opencode-goal](https://github.com/beremaran/opencode-goal) — into one composable, configurable plugin.

## Features

| Feature | What it does |
| --- | --- |
| **Orchestrator** | Turns the main agent into an orchestrator that decomposes requests into small, verifiable subtasks and delegates them via the `task` tool to routed subagents (`explore`/`general`), with per-level models and an optional multi-level delegation chain. |
| **Throttle** | Limits how many `task` invocations run in parallel (default 2), queues the rest, and releases them as sessions go idle. |
| **Goal** | Persistent, independently evaluated goals. Set an objective with `/goal`; after every turn an evaluator model decides whether it's complete, and the plugin auto-continues, budget-limits, or reports completion. |
| **Providers** | Auto-configures OpenAI-compatible providers (baseURL, apiKey, headers, model fetching) into OpenCode via `/add-provider` and `/providers`, with sources defined inline in the plugin config. |
| **Toolbox** | Aggregates tools from configured MCP servers (stdio and HTTP) behind three tools: `list_tools`, `get_tool_schema`, `invoke_tool`. |
| **Skillbox** | Discovers agent skills from the skills.sh API or public GitHub repositories and exposes `list_skills`, `search_skills`, and `load_skill`. |
| **Directives** | Injects system-prompt guidance about the plugin's own tools and mechanisms, and appends "when to use" notes to their descriptions. |
| **Configurator** | Self-configuration: `/beanie status\|validate\|apply\|init` plus the `configure_plugin` tool inspect, validate, and write the plugin's options directly into `opencode.json`. |
| **TUI companion** | Adds a Beanie dashboard route, command-palette actions (`/beanie-dashboard` and `/beanie-dashboard-refresh`), a `<leader>d` shortcut, a session status strip, goal controls with confirmation before clearing, and attention notifications for unhealthy MCP/LSP services, session errors, and completed child sessions. |

## Requirements

- Node.js 18+ (NodeNext ESM)
- OpenCode with plugin support

## Installation

Build and register the plugin in your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@beremaran/opencode-beanie-plugin"]
}
```

The server plugin and TUI companion are registered separately. The current OpenCode TUI configuration uses a separate `tui.json` (or `tui.jsonc`) file with the same top-level `plugin` key; do not add a `tui.plugin` key to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@beremaran/opencode-beanie-plugin/tui"]
}
```

When developing locally, register both built exports separately:

`opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:/path/to/opencode-beanie-plugin/dist/index.js"]
}
```

`tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:/path/to/opencode-beanie-plugin/dist/tui.js"]
}
```

The only option that is strictly required is the orchestrator's subagent model. If `orchestrator.subagentModel` is missing, the plugin refuses to start. After installing, run `/beanie init` in OpenCode for a guided, interactive setup.

## Quick start

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@beremaran/opencode-beanie-plugin",
      {
        "orchestrator": { "subagentModel": "anthropic/claude-sonnet-4-6" },
        "throttle": { "maxParallel": 3 },
        "goal": { "defaultTokenBudget": 100000, "defaultMaxTurns": 20 }
      }
    ]
  ]
}
```

Configuration is read from the plugin tuple's options object. Feature names are **camelCase** (matching the schema); the JSON schema itself uses kebab-case for property names like `per_page`.

> Restart OpenCode after changing plugin options for changes to take effect.

Restart OpenCode after changing either plugin registration or options. TUI plugin changes are loaded when the TUI starts; close and reopen the TUI to reload them. The companion reads server state through the public TUI APIs, so the current goal is not shown live in the dashboard or status strip when OpenCode does not expose a public goal-state bridge; use `/goal status` for the authoritative goal state.

## Configuration reference

All options are optional per feature; only `orchestrator.subagentModel` is required. The complete schema is exposed by `configure_plugin` with action `schema`, or via `/beanie validate`.

### Orchestrator

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `subagentModel` | `string` | *required* | Model id used for every routed subagent, e.g. `"anthropic/claude-sonnet-4-6"`. |
| `orchestratorModel` | `string` | — | Model used for the orchestrator agent(s). Falls back to OpenCode's default model. |
| `orchestratorAgent` | `string` | `"Manager"` | Name of the top-level orchestrator agent. |
| `orchestratorDepth` | `integer` | `1` | Number of orchestrator levels; level 1 is the primary agent, deeper levels are subagents (`<agent>-2`, ...). |
| `orchestratorModels` | `string[]` | — | Per-level orchestrator models; length must not exceed `orchestratorDepth`. |
| `agents` | `string[]` | built-ins + existing | Explicit list of subagents the orchestrator is allowed to delegate to. |
| `agentModels` | `object` | — | Per-agent model overrides, e.g. `{ "general": "anthropic/claude-sonnet-4-6" }`. |
| `instructions` | `string` | — | Extra instructions appended to the orchestrator's prompt. |
| `blockedTools` | `string[]` | `["edit", "bash"]` | Hands-on tools denied to orchestrator agents so they only plan and delegate. |
| `restrictTask` | `boolean` | `false` | Restrict the final orchestrator's `task` tool to the routed subagents only. |

### Throttle

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxParallel` | `integer` | `2` | Maximum number of `task` calls running at once. |
| `mode` | `"session" \| "global"` | `"session"` | Scope of the parallel limit: per session or across all sessions. |
| `maxWaitMs` | `number` | `3600000` | Max time a queued task waits before being dropped. |
| `notifyQueue` | `boolean` | `false` | Post progress messages to the session when tasks are queued/started. |

### Goal

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `evaluatorModel` | `string` | — | Model used for independent completion evaluation. Defaults to the session's model. |
| `evaluatorAgent` | `string` | — | Agent used for the evaluator session. |
| `stateDirectory` | `string` | XDG state dir | Directory where goal state JSON files are stored. |
| `maxTranscriptChars` | `integer` | `48000` | Max transcript characters sent to the evaluator per turn. |
| `defaultTokenBudget` | `integer` | — | Default token budget applied to new goals. |
| `defaultMaxTurns` | `integer` | — | Default turn budget applied to new goals. |
| `continuationDelayMs` | `integer` | `0` | Delay before the plugin auto-continues an active goal. |
| `deleteEvaluatorSessions` | `boolean` | `true` | Delete the temporary evaluator session after each evaluation. |

### Providers

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `providers` | `array` | — | Static provider sources defined inline (see below). |
| `model` | `string` | — | Set `config.model` (default model) to this id. |
| `smallModel` | `string` | — | Set `config.small_model` to this id. |
| `timeout` | `integer` | `10000` | Model-fetch timeout in milliseconds. |
| `npm` | `string` | `@ai-sdk/openai-compatible` | npm package used for the provider. |
| `env` | `boolean` | `true` | Allow `${VAR}` interpolation of apiKey/headers/baseURL from environment variables. |

Per-provider source options (`providers` array entries):

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | — | Provider id (also used as the config key). |
| `name` | `string` | — | Display name. |
| `baseURL` | `string` | — | OpenAI-compatible base URL, e.g. `http://localhost:11434/v1`. |
| `apiKey` | `string` | — | Bearer token (supports `${VAR}` interpolation). |
| `headers` | `object` | — | Extra headers sent with model fetch requests. |
| `npm` | `string` | `@ai-sdk/openai-compatible` | npm package used for this provider. |
| `kind` | `"auto" \| "openai" \| "ollama" \| "unsloth" \| "lmstudio"` | `"auto"` | Server protocol used to discover model limits (see below). |
| `modelsURL` | `string` | `<baseURL>/models` | Override the model list URL (OpenAI-compatible shape). |
| `fetchModels` | `boolean` | `true` | Fetch the model list at startup. |
| `staticModels` | `object` | — | Explicit model entries (name/limit/capabilities) merged with discovered ones. |
| `overrides` | `object` | — | Per-model overrides, highest precedence. |
| `include` / `exclude` | `string[]` | — | Glob filters over discovered model ids. |
| `defaultLimit` | `object` | — | Context/output fallback for models the server/inference doesn't cover. |
| `env` | `boolean` | `true` | Allow `${VAR}` interpolation for this source. |
| `timeout` | `integer` | `10000` | Fetch timeout in milliseconds. |

```json
{
  "id": "my-ollama",
  "name": "Local Ollama",
  "baseURL": "http://localhost:11434/v1",
  "kind": "ollama",
  "apiKey": "${OLLAMA_KEY}",
  "headers": { "X-Custom": "value" },
  "fetchModels": true,
  "defaultLimit": { "context": 64000, "output": 8192 },
  "include": ["my-model-*"],
  "exclude": ["test-*"],
  "env": true
}
```

The OpenAI-compatible `/v1/models` spec has no context-window field, so the plugin discovers limits per `kind`:

| `kind` | Model source | Context detection |
| --- | --- | --- |
| `openai` / `auto` | `<modelsURL>` or `<baseURL>/models` | Fields embedded in the listing (`context_length`, `max_context_length`, `n_ctx`, `context_window`, `input_token_limit`, …); output via `max_output_tokens`, `max_tokens`, `output_token_limit`, … |
| `ollama` | `<baseURL>/api/tags` | Ollama's `context_length` field per model |
| `unsloth` | `<baseURL>/models` + per-model `/api/models/gguf-variants?repo_id=…` | The GGUF's real `context_length` |
| `lmstudio` | `<baseURL>/api/v0/models` | LM Studio's native `max_context_length` (embedding models are filtered out) |

When neither the server nor `defaultLimit` provides a context window, the plugin falls back to a curated model-family table (Qwen 3.5/3.6 → 256k, Qwen 3 → 128k, DeepSeek → 128k, Llama 3.1+ → 128k, etc.). OpenCode requires both `context` and `output` per model and disables auto-compaction when the context is unknown, so the plugin always writes a complete `limit`: a missing output defaults to half the context (capped at 32000), a missing context to 128000. Precedence: detected API value > `defaultLimit` > name-based inference.

Vision-capable models are marked automatically so OpenCode accepts image attachments: `attachment: true` plus `modalities: { "input": ["text", "image"] }` (this is what actually enables sending images). Sources: Unsloth's `has_vision`, LM Studio's `type: "vlm"`, Ollama's `capabilities`, or embedded `has_vision`/`modalities`/`input_modalities` fields. Set `attachment: false` in `overrides` to force a text-only model, or `modalities` to fine-tune input support.

### Skillbox

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `registry` | `"auto" \| "skills-sh" \| "github"` | `"auto"` | Registry backend. `auto` uses skills.sh when a token is present, otherwise GitHub. |
| `skillsShToken` | `string` | env `SKILLS_SH_TOKEN` | Token for the skills.sh API. |
| `githubSources` | `string[]` | 7 curated repos | GitHub `owner/repo` skill sources. |
| `githubToken` | `string` | env `GITHUB_TOKEN` | Token for private/high-rate GitHub access. |
| `maxBytes` | `integer` | — | Byte budget for `load_skill` payloads; overflow is truncated with a marker. |
| `debug` | `boolean` | env `SKILL_DEBUG` | Emit debug logs to OpenCode. |

Defaults for `githubSources`: `vercel-labs/skills`, `anthropics/skills`, `obra/superpowers`, `mattpocock/skills`, `microsoft/azure-skills`, `supabase/agent-skills`, `prisma/skills`.

### Toolbox

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `config` | `object` | — | Inline config object with `mcpServers` (and optional tuning keys, see below). External JSON config files are not supported. |
| `servers` | `object` | — | Inline MCP server map (merged with `config`). |

An MCP server can be stdio or HTTP:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": { "HOME": "/home/user" },
      "cwd": "/path/to/project",
      "timeout": 30,
      "toolFilter": ["browser_*"],
      "tags": ["web"],
      "disabled": false
    },
    "remote": {
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" },
      "transportType": "streamable-http"
    }
  }
}
```

Inline config options also accept `searchTopK` (default 20), `cacheToolMetadata` (default `true`), `processPoolSize` (default 8), `timeoutSeconds` (default 30), and `idleTimeoutMs` (default 300000).

`list_tools` connects servers whose metadata is not loaded yet on the default path (rows marked `[stale]` otherwise), so it reflects reality on a cold session. Pass `refresh: true` to force a reconnect and reload of tool metadata, or `refresh: false` to use only already-loaded metadata.

### Directives

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `defaults` | `boolean` | `true` | Inject the default plugin-capabilities system directive. |
| `system` | `string[]` | `[]` | Extra system prompt lines appended verbatim. |
| `tools` | `object` | `{}` | Extra "when to use" guidance appended to specific tool descriptions. |
| `mechanisms` | `string[]` | all | Which mechanism notes to include in the system directive: `goal`, `orchestrator`, `throttle`, `skillbox`, `toolbox`, `providers`, `configurator`. |

## Slash commands

| Command | Description |
| --- | --- |
| `/beanie` | Show current effective configuration and validation. |
| `/beanie status` | Same as above. |
| `/beanie help` | Show usage help. |
| `/beanie validate [json]` | Validate the current config, or a JSON object of options. |
| `/beanie apply <json>` | Validate and write options to `opencode.json`. |
| `/beanie init` | Guided setup: the agent walks through each feature and writes the config. |
| `/goal <condition>` | Set a persistent goal, e.g. `/goal --tokens 100k --max-turns 20 Fix the failing checkout tests`. |
| `/goal status` | Show the current goal's status, budgets, and latest evaluation. |
| `/goal pause` / `/goal resume` / `/goal clear` | Pause, resume, or clear the session goal. |
| `/add-provider <id> <baseURL> [apiKey] [--name "..." --kind auto\|openai\|ollama\|unsloth\|lmstudio --context N --output N --no-fetch]` | Add or update an OpenAI-compatible provider by writing it into the plugin's `providers` option in `opencode.json`. |
| `/providers` | List configured providers with live model counts. |

`/goal` supports `--tokens` (plain integers or `k`/`m` suffixes) and `--max-turns` before the objective.

## Tools

| Tool | Feature | Description |
| --- | --- | --- |
| `get_goal` | Goal | Read the active goal's status, budgets, usage, and last evaluator reason. |
| `update_goal` | Goal | Claim the goal complete (for independent verification) or blocked (after ≥3 recurring turns of the same blocker). |
| `list_skills` | Skillbox | Browse skills from the registry with pagination and views (`all-time`, `trending`, `hot`). |
| `search_skills` | Skillbox | Keyword search across the registry. |
| `load_skill` | Skillbox | Load a skill's full `SKILL.md` and optional supporting files, byte-budgeted. |
| `list_tools` | Toolbox | List or search aggregated MCP tools; auto-connects idle servers on the default path (`refresh: true` forces a reload, `refresh: false` uses the cache only). |
| `get_tool_schema` | Toolbox | Fetch the full JSON Schema for one upstream tool. |
| `invoke_tool` | Toolbox | Invoke one upstream tool and serialize the result faithfully. |
| `configure_plugin` | Configurator | `status`/`schema`/`validate`/`apply` the plugin's options in `opencode.json`. |

## How goals work

1. `/goal <objective>` persists a goal keyed to the session (state stored under the XDG state directory, scoped by project and directory).
2. While a goal is `active`, every session turn triggers an independent evaluator call that judges completion against evidence in the transcript.
3. If incomplete and under budget, the plugin auto-continues with a continuation prompt. `completionClaim`s made via `update_goal` are verified by the evaluator.
4. Goals stop at completion, pause (interruption/error), `blocked` (after ≥3 turns of the same blocker), or budget/turn limits — the last case produces a concise handoff.

To avoid surprises, set `goal.evaluatorModel` and budgets (`defaultTokenBudget`, `defaultMaxTurns`) so evaluation cost and runtime stay bounded.

## Development

```sh
npm install
npm run check   # tsc --noEmit — the verification gate
npm run lint    # biome check src
npm run build   # tsc emitting to dist/ (required before loading the plugin)
```

- `dist/` is gitignored build output; it is never edited by hand.
- Relative imports must use explicit `.js` extensions (NodeNext).
- There is no `@types/node`; each feature ships a hand-written `node-shims.d.ts` for the Node APIs it uses. Extend the local shim if more APIs are needed — do not add `@types/node`.
- To add a feature, create `src/features/<name>/index.ts` exporting a `Plugin`, and register it in the `features` record in `src/index.ts` (feature options are read from `options.<featureName>`).
- `@opencode-ai/plugin` is pinned to `1.18.16`; reconcile features when hooks/types change upstream.

## Contributing

Bug reports, feature ideas, and pull requests are welcome. Please open an issue first for non-trivial changes so the direction is agreed before the work begins. Ensure `npm run check` and `npm run lint` pass on your changes.

## Releasing

Releases are published to npm automatically by the [Publish to npm](.github/workflows/publish.yml) GitHub Actions workflow:

1. Bump the `version` in `package.json` (keep [SemVer](https://semver.org) and add a matching entry to `CHANGELOG.md`).
2. Commit the change and push it to `main`.
3. Tag the release with the same version, e.g. `git tag v0.2.0 && git push origin v0.2.0`.

The workflow type-checks, builds, verifies the tag matches the `package.json` version, then runs `npm publish --provenance --access public` using npm's trusted publishing (OIDC), so no token secret is needed. Set it up once in your npm account:

1. Go to [npmjs.com](https://www.npmjs.com) → *Account Settings* → *Access Tokens* → *Add Publisher* (or under the package's *Access* tab).
2. Enter the GitHub repo (`beremaran/opencode-beanie-plugin`) and the environment name `npm-publish` (this must match the `environment` in the workflow).
3. Create the `npm-publish` environment in GitHub: *Settings* → *Environments*, optionally with a protection rule so publishing is gated.

The workflow must be run from a matching release tag; manually dispatching it from a branch fails tag verification.

## License

[MIT](LICENSE)
