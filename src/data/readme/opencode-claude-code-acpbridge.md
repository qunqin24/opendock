# opencode-claude-code-acpbridge

**Use [Claude Code](https://www.anthropic.com/claude-code) inside [OpenCode](https://opencode.ai)**, on your Claude
subscription. Claude Code becomes one more model in OpenCode; Claude does the thinking, and
**OpenCode stays in charge**: it runs the tools, with its own permissions and TUI.

> [!IMPORTANT]
> **OpenCode V2 only.**
> - **Requires OpenCode ≥ 2.0.14.** This package uses the V2 plugin runtime: `Plugin.define`,
>   the `plugins[]` config list and the `provider.transform` / `agent.transform` /
>   `session.hook` APIs.
> - **Does not load in OpenCode V1.** For V1, stay on `0.8.x` (see
>   [Upgrading from 0.8.x](#upgrading-from-08x-opencode-v1)).
> - **Tested with:**
>   - OpenCode 2.1.1;
>   - `@agentclientprotocol/claude-agent-acp` 0.31.x;
>   - Claude Code CLI 2.1.119.
>
> Check your version with `opencode --version`.

One npm package registers itself both as an OpenCode **plugin** (`default Plugin.define(...)`)
and as a **model provider** (`createACPModelProvider`).

---

## Contents

- [What is this, in plain words](#what-is-this-in-plain-words)
- [Requirements](#requirements)
- [Install](#install)
- [Update / reinstall](#update--reinstall)
- [First use: agents, models and effort](#first-use-agents-models-and-effort)
- [Billing: subscription vs extra usage](#billing-subscription-vs-extra-usage)
- [Configuration reference](#configuration-reference)
- [Agents and subagents](#agents-and-subagents)
- [Tools and the permission bridge](#tools-and-the-permission-bridge)
- [Switching models mid-session, and token cost](#switching-models-mid-session-and-token-cost)
- [Images, PDFs and other attachments](#images-pdfs-and-other-attachments)
- [Resuming a session in Claude Code](#resuming-a-session-in-claude-code)
- [Diagnostics and troubleshooting](#diagnostics-and-troubleshooting)
- [Status and limitations](#status-and-limitations)
- [Upgrading from 0.8.x (OpenCode V1)](#upgrading-from-08x-opencode-v1)
- [Development](#development)
- [License](#license)

---

## What is this, in plain words

| Term | What it means here |
| --- | --- |
| **OpenCode** | An open-source coding agent with a TUI, a desktop app and a CLI. They all talk to a local OpenCode **server**. |
| **Plugin** | A package the OpenCode server loads to add features. You list plugins in `opencode.json`, and OpenCode installs them from npm. |
| **Provider / model** | Where OpenCode sends prompts, e.g. `anthropic/claude-…`. This package adds a provider, `acp`, whose models (`acp/default`, `acp/sonnet`, …) are served by Claude Code. |
| **Agent** | A configured assistant in OpenCode (`build`, `plan`, …). This package adds one per Claude Code mode: `claude-default`, `claude-plan`, `claude-acceptedits`, `claude-auto`, `claude-dontask`, `claude-bypasspermissions`. |
| **Tool** | Something the model can call: `read`, `edit`, `bash`, MCP tools… |
| **Claude Code** | Anthropic's coding agent (the `claude` CLI). Running through it keeps usage on your Pro/Max **subscription**. |
| **ACP** | The [Agent Client Protocol](https://agentclientprotocol.com), a standard way for an editor or client to drive a coding agent. |
| **`claude-agent-acp`** | The ACP adapter for Claude Code (`@agentclientprotocol/claude-agent-acp`). This package starts it and talks ACP to it. |

### How it works

OpenCode talks to the provider through the Vercel AI SDK `LanguageModelV3` interface. The
provider then:
1. starts `claude-agent-acp`;
2. **turns off Claude Code's own built-in tools**;
3. hands Claude **OpenCode's tools** instead, through a small internal MCP server.

When Claude calls a tool, the provider hands control back to OpenCode. OpenCode runs the tool
(asking for permission if its rules say so) and sends the result back to Claude.

```
OpenCode (orchestrator)                 opencode-claude-code-acpbridge               claude-agent-acp (agent)
  prompt + tools (read, bash, …) ─► doStream ─► ACP session (native tools OFF) ─► Claude reasons
                                               + MCP server with OpenCode's tools ─►
  ◄──── tool-call (read) ─────── finish(tool-calls)  ◄── agent calls read (MCP, deferred)
  runs read (permissions + TUI)
  tool-result ──────────────────► doStream ─► resolves the deferred tools/call ──► agent continues
  ◄──── final text ───────────── finish(stop)        ◄── end_turn
```

- **OpenCode runs the tools**, with its permission system:
  - its own (`read`, `write`, `bash`, `edit`, …);
  - those of the **MCP servers configured in OpenCode**.
- **Claude starts with a "clean brain"**: none of its built-in tools, and none of the skills,
  hooks, agents, plugins or MCP servers in your `~/.claude`. It also gets none of the
  **connectors of your claude.ai account** (Gmail, Drive, …), thanks to `strictMcpConfig`. The
  injected agents switch some native capabilities back on; see
  [Tools and the permission bridge](#tools-and-the-permission-bridge).
- **One persistent Claude Code session per conversation.** After the first turn, only what
  Claude hasn't seen yet is sent, so Claude Code's **prompt cache** is reused instead of
  re-reading the whole history every turn.

---

## Requirements

| Requirement | Notes |
| --- | --- |
| **OpenCode V2 ≥ 2.0.14** | V1 is not supported by this version, see the banner above. |
| **The ACP agent** | `claude-agent-acp`, from `npm i -g @agentclientprotocol/claude-agent-acp`, on your `PATH`. The plugin runs whatever you put in `command`; the older names `claude-code-acp` / `@zed-industries/claude-agent-acp` also work. |
| **Claude Code CLI** | `claude` installed and **logged in**: run `claude` once and log in. The provider finds it with `command -v claude`. Set `claudeExecutable` if it isn't on the `PATH`. |
| **Node.js** | The internal MCP server runs with `node`, which must be on the `PATH`. Override it with `ACP_RUNTIME_NODE`. |

You do **not** `npm install` this package yourself: OpenCode installs plugins listed in its
config.

---

## Install

```bash
# 1. The ACP agent (once)
npm i -g @agentclientprotocol/claude-agent-acp
# 2. Log in to Claude Code if you haven't yet
claude
```

3. Add the plugin to your OpenCode config:
   - global: `~/.config/opencode/opencode.json`;
   - project: `opencode.json` or `.opencode/opencode.json` at the project root.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-claude-code-acpbridge", "options": { "command": "claude-agent-acp" } }
  ]
}
```

4. Restart OpenCode: close and reopen the app, or run `opencode service restart`.

On start, the plugin **asks the agent which models it offers**, using a short-lived ACP
connection. It fills in their metadata (context, cost, modalities) from
[models.dev](https://models.dev) and **registers the `acp` provider** at runtime. You'll see
`acp/default`, `acp/sonnet`, `acp/haiku`… in the model picker, and one `claude-<mode>` agent per
Claude Code mode (`claude-default`, `claude-plan`…) in the agent picker. Check from a terminal with `opencode models | grep acp/`.

- **Discovery is cached for 1 hour** in `~/.acp-model-provider/`. Only the first start (or the
  first after the cache expires) pays the 3–5 s it takes to start the agent. Force a refresh
  with `npx opencode-claude-code-acpbridge sync claude-agent-acp`.
- **Metadata** comes from the same catalogue OpenCode uses, `~/.cache/opencode/models.json`,
  falling back to `https://models.dev/api.json`. Costs are informational.
- **Your own provider entry wins.** If you already declare a provider with the same id
  yourself, the plugin leaves it alone.

---

## Update / reinstall

OpenCode caches installed plugins and **does not refresh them on its own**. In OpenCode 2.1,
`opencode plugin update` only handles TUI plugins, so to move to a new version:

1. Stop OpenCode (close the app, or `opencode service stop`).
2. `rm -rf ~/.cache/opencode/npm/opencode-claude-code-acpbridge@*`
3. Start OpenCode again. It installs the latest version.

The first request after that can take a few extra seconds while the package installs.

---

## First use: agents, models and effort

Pick a **`claude-<mode>`** agent in OpenCode (`claude-default` to start). The `acp/…` models
belong to those agents only: see [Models are paired with the Claude Code agents](#models-are-paired-with-the-claude-code-agents).

**Models.** The list comes from **your account**, not from this package: it's whatever the
agent reports. At the time of writing, on a Max account:

| Model | What it is |
| --- | --- |
| `acp/default` | Claude Code's default, recommended model (Opus) |
| `acp/sonnet` | Sonnet |
| `acp/haiku` | Haiku |
| `acp/sonnet[1m]` | Sonnet with a 1M-token context window, labelled "· extra usage": Anthropic bills the 1M window outside the subscription |

- `opus` works through `claudeCode.model` even though discovery doesn't list it.
- You can also use full ids such as `claude-sonnet-4-6`.

**All models and effort levels share one agent process.** The model is applied per session
with `session/set_model`, so switching `opus` → `sonnet` mid-conversation keeps the session: no
replay, no new process. The same goes for the agent's mode (`session/set_mode`) and effort.

**Effort** (how hard Claude thinks) is exposed as model **variants**: `acp/sonnet#low` …
`#medium`, `#high`, `#xhigh`, `#max` (V2 syntax `provider/model#variant`). It is applied live
(`setSessionConfigOption`); the model **without** a variant goes back to the session's own
effort. Pick one in the TUI, or set it per agent (see [Agents and subagents](#agents-and-subagents)) or for the whole
provider:

```jsonc
"options": { "command": "claude-agent-acp",
  "claudeCode": { "model": "sonnet", "effort": "xhigh", "thinking": { "type": "enabled", "budgetTokens": 16000 } } }
```

> [!NOTE]
> `opencode run` **without `-m` ignores an agent's `model`**: the V2 CLI uses the global
> model from config. In the CLI pass `-m acp/…`. In the TUI, the agent and model pickers do
> apply the model each agent declares.

---

## Billing: subscription vs extra usage

In plain ACP the client doesn't control the agent's system prompt. `claude-agent-acp` adds an
extension (`_meta.systemPrompt`) to pass OpenCode's system prompt along. **This matters for
billing:** Anthropic classifies the session by its system prompt. With OpenCode's system prompt
the session counts as a **third-party app** and is billed as **extra usage**; Claude Code's
official preset is billed to your **Pro/Max subscription**.

`claudeCode.systemPromptMode` sets that trade-off:

| Value | Effect | Billing |
| --- | --- | --- |
| `"preset"` (**default**) | OpenCode's system prompt is **ignored**; Claude uses the official `claude_code` preset. OpenCode's tools are still orchestrated (through MCP); Claude behaves like native Claude Code instead of following OpenCode's instructions. | **Subscription** |
| `"append"` | Preset + OpenCode's system prompt appended: full OpenCode fidelity. | Extra usage |
| `"replace"` | OpenCode's system prompt replaces the preset. | Extra usage |

With `preset`, `forwardEnvContext` (on by default) still passes the **factual** part of
OpenCode's system prompt to Claude as user context, so Claude knows where it is working:
- the `<env>` block: working directory, workspace root, git, platform, date;
- `<available_references>`.

OpenCode's behavioural instructions are never forwarded, so this stays on the subscription.

> Tested empirically:
> - The switch to extra usage comes from an Anthropic classifier that reads the system
>   prompt and recognises a third-party app. The name, the mode or the size don't trigger it.
> - With `preset`, `scripts/verify-billing.mjs` measures **0 extra usage**, including with
>   the native features the injected agents enable.

---

## Configuration reference

### Plugin options

Everything goes in the plugin's `options`. Options not specific to the plugin are passed on to
the provider.

| Option | Type | Env var | Default | Description |
| --- | --- | --- | --- | --- |
| `command` | `string` | `ACP_COMMAND` | — | ACP agent command, e.g. `"claude-agent-acp"`. **Without it the plugin doesn't register anything** (manual setup, see below). |
| `args` | `string[]` | `ACP_ARGS` (JSON array or space-separated) | — | Arguments for `command`. |
| `cwd` | `string` | `ACP_CWD` | server's working directory | Working directory of the agent process. |
| `env` | `Record<string,string>` | — | — | Extra environment variables for the agent process. |
| `claudeExecutable` | `string` | `CLAUDE_CODE_EXECUTABLE` | `command -v claude` | Path to the `claude` binary. |
| `streamCloseTimeoutMs` | `number` | `ACP_STREAM_CLOSE_TIMEOUT_MS` | `600000` | Sets `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT` for older agents. `claude-agent-acp` ≥ 0.31 doesn't read it: a pending tool call is bounded by `MCP_TOOL_TIMEOUT` (~27 h by default), so waiting for you to approve a permission never cuts the turn. |
| `providerId` | `string` | — | `"acp"` | Provider id the models are registered under (see [below](#changing-the-provider-id)). |
| `name` | `string` | — | `"Claude Code (ACP)"` | Provider display name. |
| `agents` | `false \| Record` | — | one per mode | `false` injects no agents. A `Record` **replaces** the default `claude-<mode>` definitions entirely, including their native toolset ([details](#agents-and-subagents)). |
| `agentModel` | `string` | — | `"default"` | Model of the injected agents. |
| `pairModels` | `boolean` | — | `true` | Reserve the provider's models for the injected agents, and those agents for the provider's models ([details](#models-are-paired-with-the-claude-code-agents)). `false` lets any agent use any model. |
| `titleFromModel` | `boolean` | — | `false` | Let the model title sessions. By default the plugin titles them from the first user message, with no model call. |
| `npm` | `string` | — | auto | Package spec the provider is loaded from. Only needed in unusual setups. |
| `claudeCode` | `object` | — | "clean brain" | How Claude Code runs: the table below. |

### `claudeCode` options

**Ecosystem: what Claude Code loads**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `configDir` | `string \| "isolated" \| false` | `false` | `false` uses your `~/.claude`, so sessions started in OpenCode can be resumed with `claude --resume` ([details](#resuming-a-session-in-claude-code)). It doesn't load your ecosystem: `settingSources` / `tools` / `strictMcpConfig` decide that. `"isolated"`: a clean dir under `~/.acp-model-provider/` with your credentials linked in (sessions invisible to `claude --resume`). A path is used as `CLAUDE_CONFIG_DIR` as is. |
| `settingSources` | `("user"\|"project"\|"local")[]` | `[]` | Claude Code settings to load (hooks, agents…). |
| `tools` | `string[]` | `[]` | Built-in Claude Code tools to enable. `[]` = none. Overrides the toggles below. |
| `disallowedTools` | `string[]` | — | Built-in tools to forbid. |
| `allowedTools` | `string[]` | `["mcp__opencode"]` | Tools approved without asking. By default OpenCode's own tools, for **every** agent on this provider, subagents included: OpenCode already authorises them, so there's no double prompt. |
| `strictMcpConfig` | `boolean` | `true` | Use **only** OpenCode's tool host. Ignores `.claude.json` MCP servers and your **claude.ai account connectors** (Gmail, Drive, Supabase, Notion…). `false` lets those connectors through. |
| `nativeTools` | `string[]` | — | Native Claude tools that OpenCode doesn't cover, added to `tools`. The injected agents use `["NotebookEdit", "ExitPlanMode", "WebSearch"]`. `ExitPlanMode` is what lets a plan session *leave* plan mode. |
| `resourceSearch` | `boolean` | — | Enables `ListMcpResources` / `ReadMcpResource`. |
| `nativeSubagents` | `boolean \| Record` | — | Native subagents (`Task`). `true` adds a `general` subagent that works through OpenCode's tools; a `Record` defines your own. |
| `nativeSkills` | `boolean \| string[]` | — | Claude Code skills (adds the `Skill` tool). `true` loads `~/.claude/skills` and `~/.claude/agents` (`settingSources: "user"`) with your hooks disabled. A `string[]` preloads only those skills. |
| `skillShell` | `boolean` | `false` | Lets skills use the native `Bash`. By default they work through OpenCode's tools. |
| `projectMemory` | `boolean` | — | Loads the project's `CLAUDE.md` / `AGENTS.md` (`settingSources: "project"`). |
| `agents`, `hooks`, `mcpServers`, `plugins`, `systemPrompt` | — | — | Inject your own subagents, hooks, MCP servers, plugins or an advanced system prompt. |
| `options` | `Record<string,unknown>` | — | Free passthrough to `_meta.claudeCode.options`, for any Claude Agent SDK option. |

**Model and reasoning**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `model` | `string` | the OpenCode model id | Claude model: alias (`sonnet`, `haiku`, `opus`, `default`), variant (`sonnet[1m]`) or full id. |
| `fallbackModel` | `string` | — | Model to use if the primary one fails. |
| `effort` | `"low"\|"medium"\|"high"\|"xhigh"\|"max"` | agent's default | Reasoning effort. The `#effort` model variants set it too. |
| `thinking` | `{type:"adaptive"\|"enabled"\|"disabled", display?:"summarized"\|"omitted", budgetTokens?}` | `{type:"enabled", display:"summarized"}` | Thinking config. The default shows Claude's **reasoning block** in OpenCode. `display:"omitted"` or `type:"disabled"` hides it; `"adaptive"` thinks only when needed. |
| `maxThinkingTokens` | `number` | — | Deprecated, use `thinking`. |

**Limits, mode and system prompt**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"default"\|"plan"\|"acceptEdits"\|"bypassPermissions"\|"auto"\|"dontAsk"` | — | **ACP session mode**, applied live with `setSessionMode`. E.g. `"plan"` (plan only) or `"bypassPermissions"` (OpenCode is the only permission authority). Settable per agent. |
| `permissionMode` | same values | — | Legacy. The ACP agent ignores it for the session mode: use `mode`. |
| `maxTurns` | `number` | — | Max agent turns. |
| `maxBudgetUsd` | `number` | — | Spending cap per turn. |
| `systemPromptMode` | `"preset"\|"append"\|"replace"` | `"preset"` | See [Billing](#billing-subscription-vs-extra-usage). |
| `forwardEnvContext` | `boolean` | `true` | Forward OpenCode's factual `<env>` / `<available_references>` blocks: in full once per session, then as deltas. |

**Continuity, performance and sessions**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `historyMode` | `"shadow"\|"v2"\|"legacy"` | `"shadow"` | How the provider tells what Claude already knows of the history ([details](#switching-models-mid-session-and-token-cost)). `"shadow"`: the classic fingerprint decides; the new one (user messages + tool-call ids) runs alongside and logs each disagreement. `"v2"`: the new one decides. It ignores OpenCode re-rendering old messages and plugins tagging text, and enables the compaction-related features. `"legacy"`: classic only. Env: `ACP_HISTORY_MODE`. |
| `catchupResultChars` | `number` | `8000` | Characters kept from each tool result of **another model** when Claude is caught up after a model switch. |
| `parallelTools` | `string[]` | `read, glob, grep, webfetch, websearch, skill, subagent` | OpenCode tools announced as read-only (`readOnlyHint`). Claude issues several at once, and OpenCode runs them in parallel in a single step. |
| `toolBatchMs` | `number` | `40` | How long a read-only call waits for parallel siblings before the step is closed. |
| `autoCompactPct` | `number` | `75` | Sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`. Claude compacts its own session at 75 % of the context, before OpenCode's threshold, so OpenCode's compaction rarely runs. `0` keeps Claude Code's default. |
| `nativeActivity` | `"text"\|"off"` | `"text"` | Native tools (Task/Agent, WebSearch, Skill, NotebookEdit…) leave a `⚙ …` line in the answer, with the result of Task / WebSearch / Skill. That way it stays in OpenCode's history, and any model that continues the session sees it. |
| `nativeActivityChars` | `number` | `2000` | Cap on the native result written into that line. |
| `smartRevert` | `boolean` | `true` | On a revert, forks the Claude session right before the reverted message (`resumeSessionAt`, located in its transcript) instead of starting a new session with a replay. If that isn't possible, it falls back to the replay. |
| `maxLiveSessions` | `number` | `6` | Conversations kept open at once (each is a `claude` process). The oldest idle ones are closed. |
| `idleSessionTtlMs` | `number` | `900000` (15 min) | Idle time after which a session is closed. It's resumed on the next message; coming back only costs starting the process, and Anthropic's cache lasts ~1 h on the subscription. |
| `childSessionTtlMs` | `number` | `120000` (2 min) | Same for OpenCode subagent sessions. |

### Manual provider (advanced)

Without `command` (and without `ACP_COMMAND`) the plugin **doesn't register the provider**, so
you can declare it yourself. OpenCode V2 still accepts the classic `provider` key and migrates
it. The plugin keeps a provider you declared and still injects the agents and the per-call
hooks. A full example with costs and limits:
[examples/07-manual-provider.jsonc](examples/07-manual-provider.jsonc).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [{ "package": "opencode-claude-code-acpbridge" }],
  "provider": {
    "acp": {
      "npm": "opencode-claude-code-acpbridge",
      "name": "Claude Code (ACP)",
      "options": { "command": "claude-agent-acp" },
      "models": { "sonnet": { "id": "sonnet", "tool_call": true, "reasoning": true } }
    }
  }
}
```

### Changing the provider id

The provider registers as **`acp`**. To use another id (typically **`anthropic`**, so that
[opencode-quota](https://www.npmjs.com/package/@slkiser/opencode-quota) shows your
**subscription** quota), set it in the **plugin** options. Don't declare a second provider by
hand, so there is only one backend:

```jsonc
"plugins": [
  { "package": "opencode-claude-code-acpbridge",
    "options": { "command": "claude-agent-acp", "providerId": "anthropic" } }
]
```

Auto-registration, resume, the permission bridge and the agents (`claude-default` →
`anthropic/default`) then all use that id.

> [!WARNING]
> `"anthropic"` **replaces OpenCode's official Anthropic provider**. That's fine if you don't
> use the Anthropic API directly. OpenCode may also list extra models from models.dev in the
> picker: use only the ones the agent reports (`anthropic/default`, `anthropic/sonnet`…). To
> use the API directly again, remove `providerId`.

---

## Agents and subagents

The plugin **injects one agent per Claude Code session mode**, as the agent reports them on
start (model `acp/default`; `claude-default` comes first):

| Agent | Mode | Native tools (Skill, Task, WebSearch, NotebookEdit…) |
| --- | --- | --- |
| `claude-default` | `default` | Every one goes through the [permission bridge](#tools-and-the-permission-bridge): **OpenCode stays the only authority**. |
| `claude-plan` | `plan` | Claude **plans** (researches, reads, writes the plan) without making changes until you approve it. Effort variant `high`. |
| `claude-acceptedits` | `acceptEdits` | Native edits are accepted without asking. |
| `claude-auto` | `auto` | Claude Code's classifier approves or denies each native action. |
| `claude-dontask` | `dontAsk` | Native actions not pre-approved are denied, never asked. |
| `claude-bypasspermissions` | `bypassPermissions` | Never asks: the permission bridge is skipped. |

They share the same native toolset and differ only in their starting mode. **The mode only
governs Claude's native tools.** OpenCode's own tools (`bash`, `edit`, `write`, MCP…) always
run with the OpenCode permissions of the agent, whatever its mode: restrict or open those in
the `agents` section of your config (below). **Effort** is picked as usual, as a variant of the
`acp/…` model.

To **adjust** them (permissions, model, description), use the `agents` section of your
OpenCode config, shown just below. To **replace** them with your own agents, use the plugin's
`agents` option:

```jsonc
"plugins": [{ "package": "opencode-claude-code-acpbridge",
  "options": { "command": "claude-agent-acp",
    "agents": {                       // or "agents": false to inject none
      "claude-default": { "model": "default", "options": { "mode": "default" } },
      "claude-plan":    { "model": "default", "variant": "high", "options": { "mode": "plan" } }
    }
  }
}]
```

> [!WARNING]
> A plugin-level `agents` record **replaces** the built-in definitions (and the pairing then
> covers exactly the agents you list). Your `options` are all
> those agents get, so the native toolset of the defaults is gone unless you list it:
> - `disallowedTools`;
> - `resourceSearch`, `nativeSubagents`;
> - `nativeTools: ["NotebookEdit", "ExitPlanMode", "WebSearch"]`;
> - `projectMemory`, `nativeSkills`.
>
> A plan agent without `ExitPlanMode` can't leave plan mode. See
> [examples/05-custom-agents.jsonc](examples/05-custom-agents.jsonc).

Each agent's `options` (mode, effort, `claudeCode` fields…) reach the provider **per call**,
through the plugin's `context` hook. They are applied **live** (`setSessionMode` /
`setSessionConfigOption`), without recreating the session.

> **Your `opencode.json` wins.** In V2, agents live in the `agents` section of your config, and
> your fields beat the plugin's: `description` and `model` are only filled in if you don't set
> them. That's the place to restrict tools with a `permissions` ruleset, without touching the
> plugin:
> ```jsonc
> "agents": {
>   "claude-default": {
>     "permissions": [
>       { "action": "edit", "resource": "*", "effect": "deny" },
>       { "action": "bash", "resource": "*", "effect": "ask" }
>     ]
>   }
> }
> ```
> `"disabled": true` turns an injected agent off.

- **Modes.** OpenCode runs its tools with its own permissions, so Claude Code's permission
  modes don't change *who* authorises them:
  - `bypassPermissions` only skips the `requestPermission` round trip for native tools;
  - `plan` is the one with a real effect of its own;
  - `dontAsk` denies the native tools outright (skills, native subagents, web search).
- **Two ways to delegate.**
  - **OpenCode's `subagent` tool** is preferred for real work. The child session is visible in
    OpenCode, **any model** can continue it, and its result stays in the shared history.
  - **Claude Code's native `Task`** (the `general` subagent plus your `~/.claude/agents`) is for
    quick tasks or your specialised agents. Its result is written into the answer (see
    `nativeActivity`).
  - Both tools' descriptions steer Claude. If one of your agents relies on native
    `Bash`/`Edit`, it uses OpenCode's tools instead.
- **OpenCode subagents run on another model.** OpenCode gives a child session its parent's model
  unless the subagent has its own, and the `acp` models are reserved for the `claude-*` agents.
  So when a `claude-*` agent launches `general`, `explore`…, the plugin passes the subagent its
  own model, or OpenCode's default `model` when it has none. Without either (or with
  `model: "acp/…"` in the call), the call fails with a message saying what to set. With
  `pairModels: false`, child sessions inherit `acp` as before and:
  - get the base profile (`allowedTools: ["mcp__opencode"]`);
  - get a native permission request denied with a reason if their agent can't use `question`
    (OpenCode's `general` denies it), instead of hanging;
  - are closed after 2 minutes idle.
- **Switching to an agent with a different native profile** (other native tools,
  `allowedTools`…) **forks** the session (`session/fork`) with the new profile: same context,
  no replay.
- **Approving a plan** (`ExitPlanMode`). The dialog offers Claude Code's real choices:
  - auto;
  - accept edits;
  - approve each edit;
  - keep planning.

  If you **type** an answer instead, the plan is rejected and your text reaches Claude as
  feedback. The mode you chose survives switching from `claude-plan` to `claude-default`.
- **Resuming without resending history.** `~/.acp-model-provider/sessions.json` maps each
  OpenCode session to its Claude Code session. On reopening, the provider resumes it
  (`resumeSession`) instead of replaying the whole history. Entries older than 30 days are
  pruned automatically, and the file keeps at most 500.
- **Titles.** With `systemPromptMode: "preset"`, OpenCode's title instructions never reach
  Claude, which would answer the message instead. So the plugin titles sessions from their
  first message, with no model call. `titleFromModel: true` restores the model call.


### Models are paired with the Claude Code agents

The `acp/…` models are **only for the `claude-*` agents**, and those agents **only use `acp/…`
models** (`pairModels`, on by default):

- **Switching agent switches the model.** Picking a `claude-*` agent puts the session on that
  agent's `acp` model; going back to `build` (or any other agent) puts it back on that agent's
  model, or the last non-`acp` model the session used, or OpenCode's default `model`.
- **OpenCode's model picker still lists every model for every agent**: V2 has no per-agent model
  list. If you pick a model that breaks the pair, the plugin moves the session back to a valid
  one, and an `acp` request from another agent fails at once with
  `Claude Code: the model … is reserved for the Claude Code agents (claude-*)…`.
- **Subagents** never inherit an `acp` model (see above).
- `pairModels: false` turns all of this off.

---

## Tools and the permission bridge

The `claude-*` agents get Claude Code's native power without bypassing OpenCode:

- **Common tools → OpenCode runs them.** Claude reaches every tool OpenCode exposes through
  MCP: OpenCode's own (`read`, `write`, `bash`, `edit`, `grep`…) and those of your MCP servers.
  They run in OpenCode, with its permissions, TUI and history.
  - They're in `allowedTools: ["mcp__opencode"]`, so they **don't prompt twice**.
  - Claude's own versions are disabled: `Bash`, `Read`, `Write`, `Edit`, `MultiEdit`, `Glob`,
    `Grep`, `WebFetch`, `TodoWrite`. Whatever Claude reads lands in OpenCode's history, which
    another model may need later.
- **Native capabilities OpenCode doesn't have**, on by default in the injected agents:
  - skills (`Skill`);
  - native subagents (`Task`, working through OpenCode's tools);
  - MCP resource search (`ListMcpResources` / `ReadMcpResource`);
  - `NotebookEdit`, `WebSearch`, `ExitPlanMode`;
  - project memory (`CLAUDE.md` / `AGENTS.md`).

  What they do is written into the answer as `⚙ …` (`nativeActivity`), so it isn't lost if
  you switch models.
- **Parallel tools.** Read-only tools (`parallelTools`) are announced with `readOnlyHint`.
  Claude issues them together, and OpenCode runs them in parallel in one step. Calls that
  arrive while OpenCode is still running the previous step are queued for the next one, never
  dropped; native subagents working in parallel do this, for example.
- **Context-pruning plugins** ([opencode-dcp](https://www.npmjs.com/package/@p4r4d0xb0x/opencode-dcp)).
  The plugin denies `compress` to the `claude-*` agents. DCP rewrites OpenCode's copy of
  the history, but the Claude Code session keeps its own context, so pruning only caused
  divergences and replays. DCP keeps working for your other agents.
- **The permission bridge.** When Claude (or a native subagent) wants a **native** tool,
  Claude Code asks for permission over ACP (`requestPermission`). The provider turns that
  request into a call to OpenCode's own **`question`** tool. The dialog appears **in your TUI**
  (`Allow once` / `Always allow` / `Deny`), and **your answer** goes back to Claude.
  - Rules are checked first and settle without a dialog. They come from your
    `agents.<name>.permissions`; `action: "*"` defaults are ignored.
  - Anything not covered opens the dialog: the bridge **fails closed**.
  - `Always allow` answers are stored in `~/.acp-model-provider/always.json`.
  - The bridge needs the agent **not** to be in `bypassPermissions`: `claude-bypasspermissions`
    runs native tools without asking anyone.
- **The classic "clean brain"**, where OpenCode runs everything and there are no native tools:
  use `mode: "bypassPermissions"` with no native toggles, or a manual provider with
  `claudeCode.tools: []`.

---

## Switching models mid-session, and token cost

OpenCode sends the **full** history on every call, while an ACP session keeps **state**. The
provider keeps one Claude Code session per conversation and sends it **only what it hasn't
seen**. Claude's prompt cache lives with that session, so the session is recreated as rarely
as possible. You can switch between a `claude-*` agent (on `acp`) and any other agent and
model in the same conversation, in both directions, and carry on.

- **Claude's own answer isn't sent back.** OpenCode stores Claude's reply and resends it on the
  next turn. The provider recognises it (by the text it emitted and its own tool ids) and
  skips it.
- **Another model in between.** Say you switch to another provider and come back: the other
  model's turns reach Claude wrapped in `<other_model_turn>`, so Claude doesn't believe it
  wrote them. They include that model's tool calls and results (`catchupResultChars`). Same
  prompt cache, no new session.
- **The other way round.** What Claude does with native tools is written into the answer
  (`nativeActivity`), so the other model sees it.
- **Usage limit.** If your Claude quota runs out, the error says so plainly and isn't retried
  in a loop:
  `Claude Code: usage limit reached (resets: <when>). Switch to another agent in OpenCode (not
  claude-*) to continue with its model; the Claude Code session is kept for when you come back.`
- **Typing while Claude works** (*steer*), or **interrupting and typing something else**, both
  work:
  - your message reaches Claude, through Claude Code's own queue or together with the pending
    tool result;
  - an interrupted turn is cancelled on the agent before the new one starts.
- **Changing agent** (`claude-default` ↔ `claude-plan` …) or **toolset** keeps the session,
  live. Moving to an agent with **another native profile** forks the session.
- **Changing `acp` model** (opus ↔ sonnet) keeps the session (`session/set_model`).
- **Compaction.** Claude compacts its own session before OpenCode would (`autoCompactPct`). If
  OpenCode compacts anyway, the summary is asked of the **live session**, with a warm cache,
  not of a new session holding the whole history. With `historyMode: "v2"`, the session also
  compacts natively and **adopts** OpenCode's checkpoint, or catches up on another model's
  checkpoint, without a new session.
- **Reverting** forks the session just before the reverted message (`smartRevert`). Claude
  "forgets" the undone part, with no replay and the prefix still cached. When there's no fork
  point (e.g. after restarting the process), a new session is created. A full replay is
  bounded (~400K characters) and labelled as history, with your current request apart.

Every decision is logged in `~/.acp-model-provider/logs/acp-YYYYMMDD.log`: reuse,
continuation, new session, `historyMode: "shadow"` disagreements… In a normal conversation
you'll see `"decision":"reuse"` on every turn, and `"drop"` only on reverts and compactions.

---

## Images, PDFs and other attachments

What the agent accepts is announced in its `promptCapabilities`; see it with `ACP_DEBUG=1`.
With the current `claude-agent-acp` it's `{"image": true, "embeddedContext": true}`.
Attachments arrive as `file` parts of OpenCode's prompt, and the provider converts them to ACP
content blocks according to those capabilities:

| Type | Supported | How |
| --- | --- | --- |
| **Image** (`image/*`) | ✅ | `image` content block (base64). |
| **PDF / documents** (`application/pdf`, `text/*`, …) | ✅ | Embedded resource (`resource` block, needs `embeddedContext`). |
| **Audio** (`audio/*`) | ❌ today | The agent doesn't announce `audio`, so it's skipped with a note. It will be sent automatically once a version supports it. |
| **Video** (`video/*`) | ❌ | Not representable in ACP and not understood by Claude; skipped with a note. |

Remote URLs without embedded data are skipped: the agent only receives attachments with bytes.

---

## Resuming a session in Claude Code

By default (`configDir: false`) the agent uses **your** `~/.claude`, so every conversation
started from OpenCode is stored in `~/.claude/projects/<project>/<id>.jsonl`. You can continue
it in a terminal:

```bash
# the provider prints the id whenever it creates a session (no debug flag needed):
#   [acp] session 1c66e017-… — resumable with: claude --resume 1c66e017-…
claude --resume 1c66e017-4536-4157-80aa-e451420520e0
```

Run it **in the same working directory**: Claude Code indexes sessions by `cwd`. For the old
isolation, set `"configDir": "isolated"`: sessions then live outside your `~/.claude` and are
invisible to `--resume`.

Sharing the config directory **doesn't** load your ecosystem: `settingSources` (default `[]`),
`tools` and `strictMcpConfig` still decide that. `configDir` only decides **where the state
lives**.

---

## Diagnostics and troubleshooting

The provider always writes its log to `~/.acp-model-provider/logs/acp-YYYYMMDD.log`, because
OpenCode doesn't capture a plugin's stderr. The log holds the session lifecycle and one line
per turn decision.

| Variable | Effect |
| --- | --- |
| `ACP_DEBUG=1` | Debug lines too, on stderr and in the file. |
| `ACP_LOG=0` | No log file. |
| `ACP_LOG_DIR=<dir>` | Log file location. |
| `ACP_RECORD=<dir>` | Records every prompt exactly as OpenCode builds it, plus the decision taken. Use it to report history-sync problems. `node scripts/sanitize-recording.mjs <recording> <output> <cwd>` anonymises a recording into a test fixture. |

| Symptom | Cause / fix |
| --- | --- |
| `Model not found: acp/…` | OpenCode didn't load your config, or auto-registration failed. Run `opencode debug config`: it must list your document with `plugins`. With `ACP_DEBUG=1`, look for `[acp-plugin] auto-registered provider 'acp' … — models: …` at startup. For a local directory plugin with no `loading plugin` line, the root `index.js` is missing: run `npm run build`. |
| Auto-registration adds no models | Run `npx opencode-claude-code-acpbridge sync claude-agent-acp` to see what the agent reports and to refresh the cache. If the agent can't find the `claude` binary, set `claudeExecutable`. |
| `API Error: 400 … extra usage` | The system prompt triggered Anthropic's classifier. Use `systemPromptMode: "preset"` (the default) or a `claude-*` agent. Typical causes: `append`/`replace`, or an agent from another plugin with an aggressive system prompt. See [Billing](#billing-subscription-vs-extra-usage). |
| `Authentication required` | Claude Code isn't logged in, or the isolated config dir has no credentials. Run `claude` and log in; with `configDir: "isolated"` the provider links `~/.claude/.credentials.json` automatically. |
| Claude says it has no `read` / doesn't use the tools | The internal MCP server must run with `node` (on the `PATH`). Override with `ACP_RUNTIME_NODE`. |
| `Claude Code: usage limit reached …` | Your subscription limit. Switch to another agent (not `claude-*`) and come back later: the session is kept. |
| `Claude Code: the model … is reserved for the Claude Code agents` | An `acp` model was used by another agent. Pick a `claude-*` agent, or another model for that agent. See [pairing](#models-are-paired-with-the-claude-code-agents). |
| Many `shadow-diff` lines in the log | With `historyMode: "shadow"`, each one is a turn where the new fingerprint would have decided differently. If they're all `legacy: diverged` → `anchors: append`, `"v2"` would save those replays. |
| Token usage out of control / `cacheR` at 0 | With `ACP_DEBUG=1`, look for `dropping session … —` on every turn, which names the reason. See [Switching models](#switching-models-mid-session-and-token-cost). |
| Context keeps growing and OpenCode doesn't compact | Only the `[1m]` models advertise a 1M window, and OpenCode won't compact until close to it. Use the regular model for earlier compaction. |
| No reasoning block | Check that `thinking` isn't `display:"omitted"` / `type:"disabled"`, and look in the log for a note saying an `effort` value could not be applied. |
| Claude doesn't ask you, it assumes | It asks through OpenCode's `question` tool, so the agent must be allowed to use it (the injected agents are). |
| Claude doesn't search the web | The injected agents include the **native** `WebSearch`, in case OpenCode's `websearch` isn't available. |
| Slow with many tools | With hundreds of tools each step can take ~1 min. Reduce the tools exposed with the agent's `permissions` ruleset. |

Maintenance command:

```bash
# Refresh the discovery and models.dev caches and preview the models
npx opencode-claude-code-acpbridge sync claude-agent-acp
```

---

## Status and limitations

| Status | Feature |
| --- | --- |
| ✅ | Streaming chat, with Claude's **reasoning block** shown in OpenCode (summarized thinking by default). |
| ✅ | **Native capabilities plus permission bridge**: skills, subagents, MCP resource search and project memory, each native action approved through OpenCode's `question` dialog. All on the **subscription** (verified). |
| ✅ | **Clean-brain mode** (`mode: "bypassPermissions"`, no native toggles): no native tools, no claude.ai connectors, only OpenCode's tools. |
| ✅ | **Auto-registration** with models.dev metadata, refreshable with `npx opencode-claude-code-acpbridge sync`. |
| ✅ | **Persistent session per conversation** (prompt cache), **resume across restarts**, several conversations and subagents at once on one agent process, idle sessions closed automatically. |
| ✅ | **Token usage**: OpenCode sees the **real** context size, including on tool steps. |
| ✅ | **Model switching mid-session** in both directions (`acp` ↔ other providers) without losing context. |
| ℹ️ | Which models answer depends on your account. On a Max account (June 2026): `default` (Opus), `sonnet`, `sonnet[1m]`, `haiku`, plus `opus` though it isn't listed. |
| 🔜 | `historyMode: "v2"` as the default, once validated in real use (shadow mode). |

---

## Upgrading from 0.8.x (OpenCode V1)

1. **Plugin config**: `"plugin": [[pkg, {opts}]]` → `"plugins": [{ "package": pkg, "options": {…} }]`. If you
   declared `provider.acp` by hand, remove it: the plugin registers it at runtime.
2. **Agents**:
   - the `agent:` section becomes `agents:`;
   - `permission` (a map) becomes `permissions` (a ruleset: `[{ "action": "bash", "resource": "git *", "effect": "allow" }]`);
   - `disable` becomes `disabled`.
3. **Variants**: `acp/opus:low` → `acp/opus#low` (V2 syntax `provider/model#variant`).
4. **Per-agent options** (mode, effort, native toggles): from `agent.<n>.options` to
   `plugins[0].options.agents.<n>.options`.
5. **`claude_permission` is gone.** The permission bridge now uses OpenCode's `question` tool.
   Move any bridge rules to `agents.<n>.permissions`; the bridge evaluates them fail-closed.
6. **Local development**: point `package` at the repository **directory**, which has a root
   `index.js` re-exporting `dist/`. Don't point it at a file. Build with `npm run build`.
7. **CLI**: `opencode run` without `-m` ignores `agent.model`, so use `opencode run -m acp/…`.

Details in [CHANGELOG.md](CHANGELOG.md) and the port plan in [MIGRATION_V2.md](MIGRATION_V2.md).

---

## Development

```bash
git clone https://github.com/aorizondo/opencode-claude-code-acpbridge.git
cd opencode-claude-code-acpbridge
npm install
npm run build          # → dist/
npm test               # tsc + node --test
```

- **Unit tests** (`npm test`) need no external services. An in-process fake ACP agent
  (`test/fake-agent.mjs`: real ACP, plus real MCP against `mcp-runtime.js`) covers each
  behaviour and each fixed bug. The prompts in `test/fixtures/v2/` are **real** OpenCode V2
  prompts recorded with `ACP_RECORD`.
- **Against the real agent**: `VERIFY_MODEL=haiku node scripts/verify-<name>.mjs`. Scripts:
  - `verify-session-continuity`;
  - `verify-smart-revert`;
  - `verify-interleave-fix`;
  - `verify-stream-integrity`;
  - `verify-billing`.
- **Run your checkout in OpenCode**: point the plugin at the repository directory,
  `"plugins": [{ "package": "/path/to/opencode-claude-code-acpbridge", "options": { "command": "claude-agent-acp" } }]`.
  OpenCode loads `<dir>/index.*`, and the root `index.js` re-exports `dist/`, so build first.
- **Smoke test**: `opencode run --standalone --agent claude-default -m acp/default "…"` in a test
  project. The bridge's `question` dialog needs the interactive TUI.
- The package also exports `createACPProviderFromEnv`. It is the upstream
  `@mcpc-tech/acp-ai-provider` without tool orchestration, if you only want plain chat.

Architecture, flows (deferred tools, sessions/resume, billing) and how to extend it are in
**[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. Example configs, one per use case, are in
**[examples/](examples/README.md)**:

| Example | Shows |
| --- | --- |
| [01-minimal.jsonc](examples/01-minimal.jsonc) | The smallest working config |
| [02-per-agent-permissions.jsonc](examples/02-per-agent-permissions.jsonc) | Permissions per agent |
| [03-opencode-fidelity.jsonc](examples/03-opencode-fidelity.jsonc) | Follow OpenCode's system prompt and agents (extra usage) |
| [04-model-and-effort.jsonc](examples/04-model-and-effort.jsonc) | Model and effort |
| [05-custom-agents.jsonc](examples/05-custom-agents.jsonc) | Your own injected agents, replacing the defaults |
| [06-claude-ecosystem.jsonc](examples/06-claude-ecosystem.jsonc) | Load more of your real Claude Code setup: settings, hooks and agents (`settingSources`), plus your own MCP servers and claude.ai connectors (`strictMcpConfig: false`) |
| [07-manual-provider.jsonc](examples/07-manual-provider.jsonc) | A manual provider |
| [08-permission-bridge.jsonc](examples/08-permission-bridge.jsonc) | The permission bridge |

```
index.js                # local-directory entrypoint: re-exports dist/ (OpenCode loads <dir>/index.*)
src/
  index.ts              # exports createACPModelProvider (provider) + default Plugin.define (plugin)
  provider/
    factory.ts          # createACPModelProvider (orchestrator) + createACPProviderFromEnv (upstream, no orchestration)
    model.ts            # ACPOrchestratorModel (LanguageModelV3): turns, persistent session / resume / fork,
                        #   tool-call queue and batching, steer/abort, question bridge, usage, compaction
    history.ts          # history fingerprint: legacy keys + anchors (historyMode), normalisation
    recorder.ts         # ACP_RECORD: records OpenCode's real prompts and every decision
    env.ts              # configuration from environment variables
  acp/
    mcp-host.ts         # internal MCP server (TCP): exposes OpenCode's tools and DEFERS each tools/call
    mcp-runtime.ts      # stdio runtime the agent spawns (hand-written MCP, no deps) → TCP to the host
    claude-config.ts    # clean brain + isolated CLAUDE_CONFIG_DIR with credentials; mode/effort/system prompt
  plugin/
    index.ts            # Plugin.define: provider.transform (acp), agent.transform (claude-<mode> + rules),
                        #   context/compaction/generate hooks, title (no model), session.revert.* → clearLink
    pairing.ts          # one agent per mode; acp models ↔ claude-* agents (pairTarget, subagentDecision)
    bridge-rules.ts     # per-agent rule store + always.json; fail-closed evaluate() (ignores action:"*")
    discover.ts         # short-lived ACP connection → models / modes / capabilities
    catalog.ts          # models.dev metadata + effort variants → Model.Info[]
    cache.ts · sessions.ts   # TTL caches / OpenCode↔ACP session registry
  log.ts                # file log (~/.acp-model-provider/logs) + stderr
  bin/cli.ts            # `opencode-claude-code-acpbridge sync`
test/                   # node --test: fake-agent.mjs (in-process ACP agent), fixtures/v2 (recorded real prompts)
```

Changes: [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
