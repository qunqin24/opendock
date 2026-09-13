<div align="center">

<img src="./assets/logo.svg" width="128" alt="agent-router logo" />

# agent-router

**Switch the models assigned to your opencode agents.**
Named stacks applied to agent frontmatter · one command, one restart, new model crew.

[![npm version](https://img.shields.io/npm/v/@dylanrussell/agent-router.svg?color=06b6d4&label=npm&logo=npm&logoColor=white&style=flat-square)](https://www.npmjs.com/package/@dylanrussell/agent-router)
[![npm downloads](https://img.shields.io/npm/dm/@dylanrussell/agent-router.svg?color=06b6d4&label=downloads&style=flat-square)](https://www.npmjs.com/package/@dylanrussell/agent-router)
[![license](https://img.shields.io/npm/l/@dylanrussell/agent-router.svg?color=06b6d4&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@dylanrussell/agent-router.svg?color=06b6d4&logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/dylanrussellmd/agent-router/ci.yml?branch=main&label=CI&logo=github&logoColor=white&style=flat-square)](https://github.com/dylanrussellmd/agent-router/actions/workflows/ci.yml)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![tested with vitest](https://img.shields.io/badge/tested%20with-vitest-FCC72B.svg?logo=vitest&logoColor=black&style=flat-square)](https://vitest.dev)

[Install](#install) · [Quickstart](#quickstart) · [Stacks](#stacks) · [In the TUI](#in-the-tui) · [FAQ](#faq) · [Issues](https://github.com/dylanrussellmd/agent-router/issues)

</div>

---

## What it does

opencode agents are markdown files (`~/.config/opencode/agents/*.md`) whose YAML frontmatter carries a `model:` line:

```markdown
---
description: High-reasoning review, debugging, and architecture counsel
mode: subagent
model: anthropic/claude-opus-4-8        # ← agent-router rewrites this
reasoningEffort: high                   # ← and any option keys a stack names
temperature: 0.1
tools: { write: false, edit: false }
---
<prompt body — owned by you, never touched by agent-router>
```

`agent-router` keeps named **stacks** — JSON files mapping agent names to models (and optionally to provider options) — and applies them to those frontmatter lines on demand. Premium models for the workday, cheap ones for bulk chores, one command to swap the whole crew:

```json
{
  "agents": {
    "Omni":      { "model": "anthropic/claude-fable-5" },
    "oracle":    { "model": "openai/gpt-5.5", "reasoningEffort": "high" },
    "explorer":  { "model": "openai/gpt-5.4-mini" },
    "librarian": { "model": "openai/gpt-5.4-mini" },
    "fixer":     { "model": "openai/gpt-5.5", "thinking": { "effort": "low" } }
  }
}
```

The prompt body and opencode framework keys (`description`, `mode`, `permission`, `tools`, …) are yours; agent-router rewrites only the `model:` line and the option keys a stack entry names, atomically, through symlinks (dotfile-manager setups survive intact).

```
~/.config/opencode/
├── agents/                     ← your agent .md files (the live target)
└── agent-router/
    ├── state.json              ← {active, previousActive, …}   (machine state)
    ├── stacks/
    │   ├── premium.json        ← named stacks                   (your config)
    │   └── cheap.json
    └── history/                ← rolling 20 most-recent switches
```

Stacks are config, history is state — point `stacksDir` somewhere dotfile-managed if you version your setup (see [Configuration](#configuration)).

## Install

```bash
npx -y @dylanrussell/agent-router init
```

`init` will:

1. Capture your agents' current models into a first stack (`default`) and mark it active.
2. Add `@dylanrussell/agent-router@latest` to the `plugin` array in `opencode.json` (backing it up first).
3. Add the same entry to `tui.json` — this loads the sidebar + `/agent-*` commands (opencode ≥ 1.17).
4. Remove the legacy `@dylanrussell/omo-router` plugin entry if present.

Then **restart opencode** so it picks up the plugin.

## Quickstart

```bash
agent-router capture my-mix           # snapshot current frontmatter models as a stack
agent-router list                     # show stacks; * marks active
agent-router use cheap                # apply a stack (validates first)
agent-router back                     # undo the most recent switch
agent-router current                  # print the agent → model mapping in frontmatter
agent-router status                   # print active stack name
agent-router show cheap               # print a stack's JSON
agent-router edit cheap               # open a stack in $EDITOR
agent-router validate --all           # check every stack against `opencode models`
agent-router history                  # list recent switches
agent-router import my-mix <file>     # import a stack from a file
agent-router export my-mix <file>     # export a stack to a file
agent-router rm my-mix                # remove a stack
agent-router path                     # print all paths used (debugging)
agent-router completion               # install shell autocompletion
```

The everyday loop: tune your agents until you like them → `capture <name>` → repeat with other models → `use <name>` to swap between the results.

## Stacks

A stack file needs one thing: an `agents` record whose entries carry a `model` string. Agent names are the `.md` basenames in your agents dir (`Omni` ↔ `Omni.md`). Except for router-owned `fallbacks`, other keys on an entry are provider pass-through options (`reasoningEffort`, `thinking`, `temperature`, `topP`, `maxOutputTokens`, …) that opencode forwards to the model — agent-router transcribes these to the agent's frontmatter alongside `model:` and captures them back. Unknown keys are preserved round-trip.

```json
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.5",
      "reasoningEffort": "high",
      "thinking": { "effort": "low" }
    }
  }
}
```

- **Apply** writes/updates only the option keys a stack entry names; options the stack omits are left in place. To **clear** an option, set it to `null` in the stack entry.
- Reserved opencode framework keys (`description`, `mode`, `permission`, `tools`, `prompt`, `steps`, `color`, `name`) are never transcribed — a stack entry can't clobber them.
- Option values serialize to a single frontmatter line: scalars bare (quoted only when needed), objects/arrays as JSON flow. Block-style values an apply replaces are collapsed to flow; `capture` parses them back into typed JSON.

`use` is strict by design: if a stack references an agent file that doesn't exist, or one without a `model:` line, the switch fails **before anything is written** — your suite is never left half-switched. It also validates every model ID against `opencode models` first (skip with `--no-validate`, override with `--force-invalid`).

`capture` is the inverse: it reads the current `model:` line and option keys of every agent file (files without a `model:` line are skipped) and writes a stack. There are no bundled seed stacks — your real setup is the seed.

## Ordered Fallbacks

Optional per-agent fallback chains select a model for the **next explicitly submitted user turn**, not an automatic retry of the failed turn. Enable by adding `fallbacks` to a stack, applying that stack, and restarting opencode with the server plugin loaded:

```json
{
  "agents": {
    "oracle": {
      "model": "openai/gpt-5.5",
      "variant": "high",
      "fallbacks": [
        { "model": "anthropic/claude-sonnet-4-6", "variant": "low" },
        { "model": "openai/gpt-5.4-mini" }
      ]
    }
  }
}
```

Model IDs and variants above are illustrative; use models and variants supported by your providers.

- `model` remains the primary. Primary `variant` is an optional nonempty string; `null` clears it on apply.
- `fallbacks` is optional, or an array of 0 to 8 objects. Each object contains only `model` (non-whitespace `provider/model`) and optional `variant` (nonempty string). `null`, bare strings, unknown candidate fields, and longer chains are rejected.
- Candidate order is preserved. Exact `(model, variant)` duplicates, including the primary, are skipped at runtime. An omitted fallback variant clears the previous candidate's variant.
- Only model and variant change at runtime. Agent prompts, permissions, tools, and other provider options remain unchanged; ensure those options are compatible with every candidate.
- Validation checks every primary and fallback ID, reporting paths such as `agents.oracle.fallbacks.0.model`. It checks catalogue membership through `opencode models`, not live provider health, credentials, quota, or variant support. `validate --active` includes applied fallback metadata when its primary still matches frontmatter.
- Failover does not rewrite frontmatter, stacks, history, or router state. `use` stores the applied chains in optional `state.json.fallbackAgents`. Old state files without that field remain valid and have no enabled chains until the stack is reapplied.
- `capture` and displaced-history snapshots merge those applied chains with live frontmatter only when primary model and variant still match. Editing a stack alone does not alter applied metadata. Applying a stack without chains clears the applied chains, including agents omitted from that stack.
- `back` retains its existing semantics: reapply a previous **named stack as it exists now**, not restore historical snapshot bytes. Runtime failover never adds a history entry.

### Runtime Behavior And Limits

The plugin watches correlated assistant `message.updated` errors, requiring the current user-message parent ID, agent, and selected provider/model. It stages the next candidate only for structured `APIError` with `isRetryable: true` and HTTP **429, 500, 502, 503, or 504**. Native opencode retries may occur before the terminal error reaches this hook. Router does not change their policy or timing.

Authentication/permission errors, context overflow, content filtering, output-length errors, unknown errors, transport errors without an HTTP status, and ambiguous `session.error` notifications do not advance the chain. Router never classifies errors by substring matching.

After a qualifying failure a 15-second warning toast (or log fallback) names the next model and asks for an explicit retry/continue instruction. Every notice is also logged under `agent-router`. **Review partial output and completed tools before continuing.** The mutable `chat.message` hook selects the fallback when the next prompt is admitted; no prompt is submitted by this plugin. The successful fallback stays selected for subsequent turns. Chains advance monotonically with at most eight transitions per agent/session; exhaustion produces a notice, never wraps to the primary. There are no timers, background retries, or automatic failback.

Observed cancellation (`MessageAbortedError`), explicit model/agent switch events, and an incoming model/variant different from both the configured primary and current candidate disable routing for that session until restart. A switch to the same model is distinguishable only when the host emits its switch event. Hosts/UI paths that omit both the event and a changed selection cannot expose that manual intent to this plugin. Switching stacks with router tools disables running failover immediately; external CLI/TUI state changes disable it at the next prompt admission. Restart to activate the newly applied stack.

Duplicate/concurrent error events advance only once per user turn. Selection and bookkeeping run synchronously before notification awaits, so delayed notices cannot overwrite cancellation/manual selection. Sessions and per-agent budgets are isolated; deleted/disabled sessions remain tombstones to prevent rearming. After 1,024 tracked sessions in one plugin instance, additional sessions receive no automatic routing until restart. Untracked sessions and subagents that bypass `chat.message` are deliberately left alone.

**Verified boundary:** inspected opencode **v1.17.15** `packages/opencode/src/session/prompt.ts`: `chat.message` mutates the message before `sessions.updateMessage(info)` and the legacy session loop resolves `lastUser.model`. A deterministic in-process provider harness tests those hook semantics, explicit next-turn continuation, variant selection, and no replay/persistent writes. This is **not a real-server end-to-end provider test** and does not prove that every new v2 execution path invokes these legacy hooks. Hosts that bypass them receive no failover. There is no transparent same-turn continuation guarantee, no automatic recovery of a failed `task` invocation, and no guarantee that an LLM will not choose to repeat a tool when explicitly asked to continue.

The installed SDK exposes `/v2` `client.v2.session.switchModel` for subsequent turns, but no atomic compare-and-switch/retry contract was verified. Router deliberately does **not** call it: an asynchronous model write could race a manual selection or cancellation. No direct SDK dependency is needed; plugin hooks are the integration boundary. The TUI model picker and router status still display stack/primary assignments, not session-local runtime candidates.

### Install This Checkout

Ordered fallbacks require agent-router **1.1.0 or later**. To test a local checkout instead of the published package, run `npm run typecheck`, `npm test`, and `npm run build` using the installed dependencies (a fresh checkout uses `pnpm install --frozen-lockfile`). Replace `/absolute/path/to/agent-router` below with your checkout path, then replace the registry router entry in the **server** `opencode.json` plugin array with:

```json
"file:///absolute/path/to/agent-router/dist/plugin.js"
```

Do not load both registry and local server plugins. If using the router TUI plugin, also replace its registry entry in `tui.json` with `file:///absolute/path/to/agent-router/dist/tui.js`. Use the checkout's CLI too: older router builds strictly validate state and cannot read the new `fallbackAgents` field. Add a chain to your stack and run `node /absolute/path/to/agent-router/dist/cli.js use <stack-name>`, then quit and restart opencode. These installation/configuration steps are instructions only; implementation and tests do not modify your live agent configuration. Start a new session, and confirm you see the explicit next-turn notice after a qualifying terminal error. Headless clients must inspect the `agent-router` log.

## Inside opencode

The plugin exposes six tools the agent (or you, by asking it) can call:

| tool | what it does |
|---|---|
| `router_status` | active stack + current frontmatter mapping + available stacks |
| `router_list` | stack list with `isActive` flags |
| `router_use({name, validate?})` | apply a stack; pops a TUI toast |
| `router_capture({name, force?})` | snapshot current models into a stack |
| `router_back({n?})` | undo last N switches |
| `router_validate({name?, active?})` | check model IDs against current opencode auth |

> *"Switch to cheap"* — your agent calls `router_use`, the toast pops up, you restart opencode.

## In the TUI

On opencode ≥ 1.17 the plugin also ships a TUI half (loaded from `tui.json`, wired up by `init`):

- **Sidebar panel** — shows the active stack, the stack count, and a `⟳ restart required` badge after any switch. Updates live (≤1.5s) when the CLI or agent switches stacks underneath the TUI.
- **Commands** — type `/` or open the command palette:

| command | what it does |
|---|---|
| `/agent-switch` (alias `/ar`) | pick a stack, validate, apply |
| `/agent-view` | browse a stack's agent → model assignments |
| `/agent-edit` | reassign a model, picking from your reachable model catalog |
| `/agent-back` | confirm + revert to the previous stack |
| `/agent-validate` | check a stack's model IDs against current auth |
| `/agent-status` | toast the active stack + list |

Everything degrades gracefully: on older opencode versions (or if the TUI API changes) the sidebar and commands simply don't appear — the CLI and agent tools keep working.

Debugging the TUI half: `AGENT_ROUTER_TUI_DEBUG=/tmp/agent-router-tui.log opencode` writes a trace of the plugin's init steps.

## Configuration

Paths resolve in this order: explicit option → `config.json` → env var → default.

`~/.config/opencode/agent-router/config.json` (read identically by the CLI and the plugin — the recommended place):

```json
{
  "agentsDir": "~/.agents/agents",
  "stacksDir": "~/.agents/agent-router/stacks"
}
```

| setting | env var | default |
|---|---|---|
| agents dir | `AGENT_ROUTER_AGENTS_DIR` | `~/.config/opencode/agents` |
| stacks dir | `AGENT_ROUTER_STACKS_DIR` | `${routerHome}/stacks` |
| state home | `AGENT_ROUTER_HOME` (legacy `OMO_ROUTER_HOME`) | `~/.config/opencode/agent-router` |

## ⚠ Things to know

- **Restart required.** opencode reads agent files once at startup. After every `agent-router use`, restart opencode for the new models to take effect. The CLI reminds you.
- **Hand-edits to frontmatter are not auto-saved into stacks.** If you hand-tune a model or option and want to keep it, `capture` it (or `capture <active> --force`). The next `use` that touches that agent overwrites the hand-edit for keys the stack names; keys the stack omits are preserved (set an option to `null` in a stack entry to clear it).
- **Validation is auth-state-dependent.** `agent-router validate` runs `opencode models`, which only lists models reachable through your current auth. If you revoke a key, previously-valid stacks may suddenly be invalid.

## FAQ

**Why no variants/fallback models?** Native agent frontmatter has a single `model:` line. If you want a fallback, make it a stack (`cheap`, `free`) and switch to it. For per-stack *behavior* variants (reasoning effort, thinking budget, temperature, …), add the option as a sibling key on the stack entry — it transcribes to frontmatter on `use`.

**Can I have per-project stacks?** Point `AGENT_ROUTER_STACKS_DIR` at a project-local directory in that project's shell env.

## Architecture in 60 seconds

```
┌──────────────────────────────────────────────┐
│ opencode (Bun)                               │
│  └─ agents loaded from agents/*.md ──────────┼── reads at startup ─┐
│  └─ plugin: agent-router (this package) ─────┼─ tools, toast       │
└──────────────────────────────────────────────┘                     ▼
~/.config/opencode/agents/*.md             ◄── `model:` lines rewritten on `use`
~/.config/opencode/agent-router/
  stacks/<name>.json                       ◄── source of truth for each stack
  state.json                               ◄── pointer to active stack
  history/<ts>__<from>-to-<to>.json        ◄── displaced mappings, rolling 20
```

## Contributing

Issues and PRs welcome. Run locally:

```bash
git clone https://github.com/dylanrussellmd/agent-router.git
cd agent-router
pnpm install
pnpm test
pnpm build
```

## License

MIT — see [LICENSE](./LICENSE).
