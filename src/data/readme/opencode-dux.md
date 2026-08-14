# opencode-dux

Agent orchestration, management, and operations plugin for OpenCode. Routes tasks to specialized agents automatically.

## Quick Start

1. Add to `~/.config/opencode/opencode.json` and `~/.config/opencode/tui.json`:

```json
{ "plugin": ["opencode-dux@latest"] }
```

2. Create `~/.config/opencode/opencode-dux.jsonc`:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/bakhtiar-personal-work/opencode-dux/master/opencode-dux.schema.json",
  "preset": "default",
  "presets": {
    "default": {
      "orchestrator": { "model": "opencode-go/deepseek-v4-flash" },
      "oracle": { "model": "opencode-go/deepseek-v4-flash" },
      "explorer": { "model": "opencode-go/deepseek-v4-flash" },
      "librarian": { "model": "opencode-go/deepseek-v4-flash" },
      "designer": { "model": "opencode-go/mimo-v2.5-pro" },
      "fixer": { "model": "opencode-go/deepseek-v4-flash" }
    }
  }
}
```

3. Authenticate: `opencode auth login`

## Auto-Update

The plugin checks for updates when OpenCode starts up. If an update is available it downloads in the background.

### How it works

- When the app starts the plugin checks for a newer version
- If found it downloads the update silently in the background
- A popup shows whether the update succeeded or failed
- Restart OpenCode to apply the new version

### Installation requirement

Auto-update works with `"opencode-dux"` and `"opencode-dux@latest"`. OpenCode treats them the same.

```json
{ "plugin": ["opencode-dux"] }
```

Keep `"opencode-dux"` without a version in your config. Pinning a version like `"opencode-dux@1.3.6"` turns off auto-update.

## Agents

| Agent            | Role                 | When Used                                             |
| ---------------- | -------------------- | ----------------------------------------------------- |
| **Orchestrator** | Master delegator     | Routes tasks, strategic coordination                  |
| **Explorer**     | Codebase search      | File discovery, pattern matching                      |
| **Oracle**       | Architecture & debug | Trade-offs, root cause analysis                       |
| **Librarian**    | External research    | Documentation lookup, web search                      |
| **Designer**     | UI/UX                | Frontend, styling, accessibility                      |
| **Fixer**        | Implementation       | Scoped code changes, tests                            |
| **Steward**      | Repository rules     | Manages `.docs/`, `.opencode/`, `.cursor/rules`, etc. |
| **Interpreter**  | Image analysis       | Vision-capable model for attached screenshots         |

Routing notes:

- Bug fixes go to `@oracle` first when they need diagnosis, root-cause analysis, tradeoff evaluation, or multi-file reasoning. `@fixer` implements the approved plan.
- Before any non-mechanical `@fixer` implementation run, the orchestrator must first present the proposed fix/plan to the user and get explicit approval. The user can choose the implementation path, request changes, or stop before code is modified.
- Only purely mechanical edits such as typos, obvious single-line fixes, or user-specified exact changes may bypass `@oracle` and go straight to `@fixer`.

## Configuration

Config file: `~/.config/opencode/opencode-dux.jsonc`

Merged from two locations, project overrides user:

| Location    | Path                                     |
| ----------- | ---------------------------------------- |
| **User**    | `~/.config/opencode/opencode-dux.jsonc`  |
| **Project** | `<project>/.opencode/opencode-dux.jsonc` |

### Config options

| Field                                | Type       | Default | Description                                   |
| ------------------------------------ | ---------- | ------- | --------------------------------------------- |
| `preset`                             | `string`   | -       | Active preset name                            |
| `customInstruction`                  | `string`   | -       | Text prepended verbatim to orchestrator system prompt. Can live at root or inside active preset; root wins. |
| `presets`                            | `object`   | `{}`    | Named model configurations per agent          |
| `agents`                             | `object`   | `{}`    | Per-agent overrides on top of active preset   |
| `sessionManager.maxSessionsPerAgent` | `number`   | `2`     | Max concurrent sessions per agent type (1-10) |
| `sessionManager.readContextMinLines` | `number`   | `10`    | Min lines threshold for read context tool     |
| `sessionManager.readContextMaxFiles` | `number`   | `8`     | Max files per read context batch              |
| `todoContinuation.maxContinuations`  | `number`   | `5`     | Max consecutive auto-continuations (1-50)     |
| `todoContinuation.autoEnable`        | `boolean`  | `false` | Auto-enable when enough todos exist           |
| `contextPressure.enabled`            | `boolean`  | `true`  | Warn when context usage is high               |
| `contextPressure.warnThresholdPct`   | `number`   | `75`    | Trigger at this context usage % (1-99)        |
| `handoffArtifacts.location`          | `"project"` or `"cache"` | `"project"` | `"project"` keeps `.opencode-dux/` in repo. `"cache"` stores artifacts outside repo in app cache. |
| `websearch.provider`                 | `string`   | `"exa"` | `"exa"` or `"tavily"`                         |
| `setDefaultAgent`                    | `boolean`  | `true`  | Sets default_agent to `orchestrator`          |
| `autoUpdate`                         | `boolean`  | `true`  | Auto-update when loaded via npm name          |
| `disabledMcps`                       | `string[]` | `[]`    | Disable built-in MCPs by name                 |

### Per-agent options

| Field         | Type           | Description                            |
| ------------- | -------------- | -------------------------------------- |
| `model`       | `string`       | Simple form for all agents             |
| `thinking`    | `boolean`      | Simple form: enable/disable variants   |
| `variants`    | `string[]`     | Simple form: ordered allowed variants  |
| `default`     | `object`       | Default tier: `model`, optional `thinking` and ordered `variants` |
| `smart`       | `object`       | Oracle-only higher-capability tier with the same fields |
| `temperature` | `number` (0-2) | Model temperature                      |
| `options`     | `object`       | Provider-specific model options        |
| `displayName` | `string`       | Custom agent display name              |

Simple top-level form applies to:

- `orchestrator`
- `explorer`
- `librarian`
- `designer`
- `fixer`
- `steward`
- `interpreter`

For those agents, use top-level `model`, optional `thinking`, optional
`variants`, plus any other direct options like `temperature`.

`variants` are ordered from lower to higher thinking effort. When omitted,
opencode-dux leaves variant selection to orchestrator/provider default.
`thinking: false` suppresses variant field. Legacy `model` and
`options.smart` remain supported.

Standard agent example:

```jsonc
{
  "presets": {
    "default": {
      "orchestrator": {
        "model": "neuralwatt/moonshotai/Kimi-K2.7-Code",
        "thinking": true,
        "variants": ["high"]
      },
      "explorer": {
        "model": "opencode-go/mimo-v2.5"
      },
      "librarian": {
        "model": "opencode-go/mimo-v2.5"
      },
      "designer": {
        "model": "neuralwatt/glm-5.2",
        "thinking": true,
        "variants": ["high", "max"],
        "temperature": 0.3
      },
      "fixer": {
        "model": "opencode-go/mimo-v2.5-pro",
        "thinking": true,
        "variants": ["high"]
      },
      "steward": {
        "model": "opencode-go/mimo-v2.5"
      },
      "interpreter": {
        "model": "opencode-go/minimax-m3"
      }
    }
  }
}
```

`oracle` is special. Its top-level `model` / `thinking` / `variants` act as
default tier, and optional `smart` adds higher-capability routing.

Oracle example:

```jsonc
{
  "presets": {
    "default": {
      "oracle": {
        "model": "neuralwatt/glm-5.2",
        "thinking": true,
        "variants": ["high", "max"],
        "smart": {
          "model": "openai/gpt-5.4",
          "thinking": true,
          "variants": ["high", "xhigh"]
        }
      }
    }
  }
}
```

### Automatic Skill & MCP Discovery

The orchestrator discovers skills and MCPs before delegating to subagents:

- **Skills**: Before @oracle, @designer, or @librarian runs on a non-trivial task, the orchestrator calls `discover_skills` and `discover_mcp_servers` in parallel. Results are cached for 24 hours.
- **Installed capabilities**: Relevant installed skills and MCPs are injected into the delegation prompt with their name, description, relevance, and explicit usage instructions. For high-relevance matches, orchestrator names exact skills/MCPs, states why they apply, and tells subagents to use them directly instead of treating them as optional context.
- **Missing capabilities**: If a useful capability is found but not yet installed, the orchestrator shows the install command before moving on.
- **Approval gate**: For any new non-mechanical `@fixer` run, the orchestrator must include an explicit implementation-authorization block derived from the latest user approval. The delegate runtime rejects missing authorization, so prompt-only drift cannot silently bypass confirmation.

Discovery runs automatically for non-trivial tasks.

### Handoff Artifacts

Delegated subagent runs now persist handoff artifacts for later reuse:

Set it like this in `opencode-dux.jsonc`:

```jsonc
{
  "handoffArtifacts": {
    "location": "project" // or "cache"
  }
}
```

What to put:

- `"project"`: current behavior. Creates `.opencode-dux/` inside repo.
- `"cache"`: stores artifacts outside repo so project tree stays clean.

- `handoffArtifacts.location: "project"` (default):
  - Root: `.opencode-dux/`
  - Child session artifacts: `.opencode-dux/<agent>/<sessionId>_<yyyymmdd-hhmmss>_<slug>.md`
  - Orchestrator index: `.opencode-dux/orchestrator/<orchestratorSessionId>.md`
- `handoffArtifacts.location: "cache"`:
  - Windows: `%LOCALAPPDATA%/opencode-dux/artifacts`
  - non-Windows: `~/.cache/opencode-dux/artifacts`
  - Prompts and envelopes use absolute artifact paths in this mode

Behavior:

- Blocking `delegate_subagent` results return a compact envelope with artifact paths instead of always echoing the full raw child output.
- New `@fixer` runs require an explicit implementation-authorization block from the orchestrator. In practice this means the user must have already approved the proposed plan, unless the change is a true mechanical-edit exception.
- For true "run these several searches now and wait for all of them" behavior, the orchestrator uses batched blocking delegation internally rather than emitting separate blocking calls one-by-one.
- Parallel subagent fan-out should use `mode: "fire_forget"` for independent work streams. Read-only blocking delegations can overlap, but parallel `@fixer` batches should be collected first and then verified once by the orchestrator against the final combined repo state.
- If the orchestrator still emits multiple near-simultaneous blocking `@fixer` delegations from the same parent turn, the delegate runtime now coalesces them into one internal parallel batch instead of serializing them one-by-one.
- `delegate_collect(session_id: "...")` now waits by default for the internal completion event. Use `wait: false` only for an intentional non-blocking status probe; avoid repeated polling loops.
- Only orchestration-critical sections stay inline: `needs_user`, `blocked`, oracle `plan`, designer `design_plan` + `implementation_notes`, fixer `summary` + `verification`.
- The orchestrator system prompt keeps the routing control surface inline. Built-in tool availability does not let the orchestrator bypass specialist-only routing constraints.
- Resumed child sessions via `continue_session_id` append additional turns into the same artifact file.
- Artifacts are retained for 7 days and then pruned from the configured artifact root by the plugin.

Install new skills: `npx skills add <owner/repo> --skill <skill-name> -g -a opencode -y`

> **Skill discovery** needs `npx` on your PATH for online searches (runs `npx skills find <keywords>`). Local skill checks work without it. MCP discovery uses the npm registry directly and does not need `npx`. Both check locally installed items first and skip online lookups when enough relevant matches are found.

## Subscriptions / Account Commands

Manage API accounts from the OpenCode prompt with `/subscriptions`:

- `/subscriptions list` - View all accounts and their usage
- `/subscriptions add-opencode-go <name> <workspace-id> <auth-cookie> <api-key>` - Add OpenCode Go account
- `/subscriptions add-neuralwatt <name> <api-key>` - Add Neuralwatt account
- `/subscriptions add-deepseek <name> <api-key>` - Add DeepSeek account
- `/subscriptions add-mimo <name> <api-key> <platform_ph> <serviceToken> <slh> <userId>` - Add MiMo (Xiaomi) account (cookie values from browser DevTools)
- `/subscriptions add-codex-device <name>` - Add Codex (OpenAI) account via device auth
- `/subscriptions switch <provider> <name>` - Activate an account for a provider
- `/subscriptions remove <provider> <name>` - Delete an account
- `/subscriptions refresh` - Force refresh usage data

### Supported providers

| Provider        | Provider ID   | Usage tracking                                        | Auth method                |
| --------------- | ------------- | ----------------------------------------------------- | -------------------------- |
| **OpenCode Go** | `opencode-go` | Dashboard scraping (rolling, weekly, monthly windows) | Workspace ID + auth cookie + API key |
| **Neuralwatt**  | `neuralwatt`  | REST API (credits, kWh, token usage)                  | API key                    |
| **DeepSeek**    | `deepseek`    | Official REST API (`/user/balance`)                   | API key                    |
| **MiMo**        | `mimo`        | Platform API (balance, plan, AI Credits usage)        | API key + cookie values    |
| **Codex**       | `codex`       | REST API (5H/7D rate limits, credits)                 | Device code auth (OAuth)   |

Accounts are identified by provider and name. You can have accounts with the same name across different providers (e.g., "Main" for Codex, "Main" for Neuralwatt) without collisions. Remove a specific account with `/subscriptions remove <provider> <name>`.

Usage data appears in the TUI sidebar under **API Usage**.

All account credentials, API keys, tokens, and subscription data are stored locally on your machine. Nothing is sent to any external service or phoned home.

### Codex device auth

Codex uses your ChatGPT account, not an API key. The device auth flow works from any terminal without needing a browser on the same machine.

1. Run `/subscriptions add-codex-device <name>`
2. Open the displayed URL in any browser and sign in with your ChatGPT account
3. Enter the one-time code shown in your terminal
4. Usage tracking starts immediately

Access tokens refresh automatically. If the refresh token expires (e.g., after a password change), run `/subscriptions add-codex-device` again.

### MiMo authentication

MiMo uses both an API key (for inference) and cookie values (for usage tracking).

1. Run `/subscriptions add-mimo <name> <api-key> <platform_ph> <serviceToken> <slh> <userId>`
2. Get cookie values from browser DevTools → Application → Cookies → `platform.xiaomimimo.com`:
   - `api-platform_ph`
   - `api-platform_serviceToken`
   - `api-platform_slh`
   - `userId`

Usage tracking shows AI Credits (remaining / total) and balance in the TUI sidebar.

## Prompt overrides

Place Markdown files in `~/.config/opencode/opencode-dux/`:

- `<agent>.md` - Replace default prompt
- `<agent>_append.md` - Append to default prompt
- `<preset>/<agent>.md` - Preset-scoped prompts

## Built-in MCPs

| MCP         | Description                  |
| ----------- | ---------------------------- |
| `websearch` | Web search (Exa or Tavily)   |
| `context7`  | Library documentation lookup |
| `grep_app`  | GitHub code search           |

Disable any: `{ "disabledMcps": ["grep_app"] }`

## Skill Discovery

The orchestrator uses `discover_skills` to find relevant skills before delegating. It checks local installs first, then falls back to online search:

- **Local check**: Scans `~/.config/opencode/skills/` and `~/.agents/skills/` for installed skills, scores them by relevance against task keywords
- **Online search**: If local results are insufficient, runs `npx skills find <keywords>` to search the registry
- **MCP discovery**: Searches the npm registry for matching MCP packages, scored by relevance against task keywords

How the full flow works:

1. Orchestrator calls `discover_skills` and `discover_mcp_servers` with task keywords (blocking, cached 24h)
2. Checks locally installed skills and MCPs first
3. If enough relevant local results are found it returns them and skips online search
4. Otherwise it searches online with `npx skills find <keywords>` for skills or npm registry for MCPs
5. Installed items are injected into delegation prompts with name, description, relevance, and usage instructions
6. Useful items that aren't installed yet are recommended to the user with install commands
7. The orchestrator carries its routing and approval policy inline, then delegates once the required gates are satisfied.

Install skills: `npx skills add <owner/repo> --skill <skill-name> -g -a opencode -y`

> Skill discovery needs `npx` on your PATH for online searches (runs `npx skills find <keywords>`). Local skill checks and MCP discovery work without it.

## Development

```bash
bun run build          # Build TypeScript to dist/
bun run typecheck      # Type checking
bun test               # Run tests
bun run check:ci       # Lint + format (CI mode)
bun run generate-schema  # Regenerate JSON schema from Zod
```

## License

MIT
