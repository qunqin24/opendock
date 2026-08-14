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

A stack file needs one thing: an `agents` record whose entries carry a `model` string. Agent names are the `.md` basenames in your agents dir (`Omni` ↔ `Omni.md`). Any **other key** on an entry is a provider pass-through option (`reasoningEffort`, `thinking`, `temperature`, `topP`, `maxOutputTokens`, …) that opencode forwards to the model — agent-router transcribes these to the agent's frontmatter alongside `model:` and captures them back. Unknown keys are preserved round-trip.

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
