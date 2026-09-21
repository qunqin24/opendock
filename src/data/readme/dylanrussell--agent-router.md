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

Version 2 targets **OpenCode 2.0.8**. Version 1 remains the legacy OpenCode release. See [release notes and operational limits](./CHANGELOG.md).

```bash
npx -y @dylanrussell/agent-router init
```

`init` will:

1. Capture your agents' current models into a first stack (`default`) and mark it active.
2. Add `@dylanrussell/agent-router@latest` to the `plugins` array in `opencode.json` (backing it up first).
3. Add the same entry to `cli.json` — this loads the sidebar + `/agent-*` commands.
4. Remove the legacy `@dylanrussell/omo-router` plugin entry if present.

Then **restart opencode** so it picks up the plugin.

The API peer is pinned to `@opencode/plugin@2.0.8`. OpenCode provides the terminal renderer at runtime. Both package entrypoints default-export V2 plugin definitions.

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
agent-router validate --all           # check model IDs and variants against the V2 catalog
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

`use` is strict by design: if a stack references an agent file that doesn't exist, or one without a `model:` line, the switch fails **before anything is written**. It validates model IDs and variants against the V2 catalog first (skip with `--no-validate`, override with `--force-invalid`).

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
- Validation checks every primary and fallback ID and variant, reporting paths such as `agents.oracle.fallbacks.0.variant`. Server tools use the connected host catalog; the standalone CLI uses `opencode api model.list`. Catalog membership does not prove live provider health or quota. `validate --active` includes applied fallback metadata when its primary still matches frontmatter.
- Failover does not rewrite frontmatter, stacks, history, or router state. `use` stores the applied chains in optional `state.json.fallbackAgents`. Old state files without that field remain valid and have no enabled chains until the stack is reapplied.
- `capture` and displaced-history snapshots merge those applied chains with live frontmatter only when primary model and variant still match. Editing a stack alone does not alter applied metadata. Applying a stack without chains clears the applied chains, including agents omitted from that stack.
- `back` retains its existing semantics: reapply a previous **named stack as it exists now**, not restore historical snapshot bytes. Runtime failover never adds a history entry.

### Runtime Behavior And Limits

The V2 plugin watches `retry` hooks correlated with the admitted user turn, agent and selected model. A retryable HTTP **429, 500, 502, 503, or 504** stages the next candidate and vetoes the same-turn retry. Only primary model requests participate.

Authentication/permission errors, context overflow, content filtering, output-length errors, unknown errors, transport errors without an HTTP status, and ambiguous `session.error` notifications do not advance the chain. Router never classifies errors by substring matching.

After a qualifying failure a server log names the next model and asks for an explicit retry/continue instruction. **Review partial output and completed tools before continuing.** The next `prompt` admission hook calls `session.switchModel`; it never submits a prompt. Chains advance monotonically, never wrap, and never replay prompts or tools.

Observed interruption, explicit model/agent selection events, and an unexpected incoming model disable routing for that session. Router state changes disable startup routing at the next prompt admission. Restart to activate a newly applied stack.

Duplicate failures advance only once per admitted user turn. Routing budgets are isolated by session and agent and bounded to 1,024 sessions. Subagents without user prompt admission are left alone.

**Verified boundary:** compiled against the published **2.0.8** API types. Deterministic adapter tests cover next-turn selection, retry veto, auxiliary-request exclusion, variants, and no replay or persistent agent writes. These are not real-provider end-to-end tests. An LLM may choose to repeat a tool when explicitly asked to continue.

OpenCode 2.0.8 exposes no atomic compare-and-switch in the prompt hook and no request kind in the retry hook. Concurrent manual selections/admissions or auxiliary requests remain host API limitations. The sidebar displays configured routing and highlights the current session selection, not pending fallback state. Terminal stack operations require local filesystem access; remote server filesystem management is not supported.

### Install This Checkout

To test a local V2 checkout, run `npm run typecheck`, `npm test`, and `npm run build` (a fresh checkout uses `pnpm install --frozen-lockfile`). Replace the registry entry in the server `opencode.json` **plugins** array with the package directory:

```json
"file:///absolute/path/to/agent-router"
```

Use the same package directory in `cli.json` **plugins** when explicitly registering the terminal half. Do not load both registry and local copies. The local CLI is `node /absolute/path/to/agent-router/dist/cli.js`. Applying a stack still requires restarting OpenCode; inspect server logs for next-turn fallback notices.

OpenCode 2.0.8 ignores package exports for local directories. Root `index.ts` and `tui.ts` wrappers load the built files; run `npm run build` before using the source directory.

`npm run test:integration` starts an isolated real OpenCode 2.0.8 server, initializes its location, verifies router activation and terminal discovery, and exercises a disposable RPC probe with absent, null, and invalid input. It uses temporary HOME/XDG/router directories and never modifies live configuration. Set `AGENT_ROUTER_TEST_PACKAGE` to an unpacked tarball directory to test release contents. Router itself exposes tools, not RPC methods.

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

The V2 terminal half loads from the package's `./tui` export (`cli.json`, wired up by `init`):

- **Sidebar panel** — lists available stacks with the active one checked. Under **Current Stack**, each agent has one indented model per line, in precedence order, without Primary/Fallback labels. Explicit variants appear in brackets; full model IDs wrap rather than truncate. A `⟳ restart required` badge appears when the active stack differs from the one at TUI startup. File changes update live (≤1.5s).
- **Current selection** — the live session's agent/model is highlighted in color and bold with `●`; out-of-chain selections get a separate Current row. Other agents are not presented as live selections. Configured chains still come from the active stack file, not the applied `state.json.fallbackAgents` snapshot. Editing a stack changes the preview but does not apply it: use the stack and restart opencode to activate changes. The marker reflects session selection, not proof that a request is running or that failover is enabled.
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
- **Validation is catalog-dependent.** `agent-router validate` uses the active V2 model catalog, including variants. Catalog membership does not guarantee provider health, valid credentials, or available quota.

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
