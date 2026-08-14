# opencode-orchestrator: A Minimalist Multi-Agent Config for Opencode


> Opencode cold start finally dropped from ~20k to ~8k tokens.

`opencode-orchestrator` makes `Orchestrator` the default primary agent and adds six specialist subagents for code search, docs research, implementation, UI/UX, review, and visual analysis. This README explains where it came from, how it's put together, and how to install it.

## Origin

I started out using [omo](https://github.com/code-yeongyu/oh-my-openagent) (oh-my-opencode). It's feature-complete: tons of agents, tons of skills, tons of tools. But after a while I hit one problem: **there's just too much stuff.** Every session's context gets stuffed with agent descriptions, workflows, skill descriptions, and tool definitions you'll never actually use, burning tokens, diluting attention, and raising the odds the model "drifts" and calls a tool it shouldn't.

I then switched to [omo-slim](https://github.com/alvinunreal/oh-my-opencode-slim), which was genuinely cleaner, and it felt great for a while. But over time the author started adding his own pet tools and skills back in (things he personally used but I didn't), and omo-slim slowly stopped being slim.

So I built my own trimmed version on top of omo-slim, half-jokingly calling it **omo-slim-slim**.

The starting point is honestly that simple:

> **Agents, skills, and tools you don't use should be turned off. Context is a finite resource.**

So the whole config follows one design principle: keep the agent count down to just enough, tighten every agent's tool permissions strictly by role, deny skills you don't need at the permission layer, and keep prompts and hooks short and direct, easy to tweak to your own workflow at any time, rather than copying in a "kitchen-sink" config you can't even explain to yourself.

## Core Philosophy: Just Enough, Toggle On Demand

I care less about "is every feature here" and more about two things:

1. **Context footprint.** Every extra agent, skill, or tool definition is tokens written into the system prompt. Less noise and narrower tool permissions mean each decision reads cleaner information and attention stays focused. Not to mention that too much context makes the model **dumber faster**; past 100k you're in the Dumb Zone.
2. **Customizability.** Every agent's responsibilities and permissions are listed explicitly, not hidden behind black-box presets. The day you don't want an agent anymore, just delete it or empty its tool permissions, with no need to spelunk through nested defaults to figure out what to change.

On those two points I capped the agent count at seven and trimmed each agent's tools to "only what its role needs."

## Seven Agents, Each With Its Own Job

### 1. Orchestrator (primary)

- **Model:** glm-5.2 (variant max)
- **Role:** Workflow supervisor: plans tasks, delegates to the right subagents, monitors progress, reconciles and verifies their deliverables.
- **Tools:** read, glob, grep, bash, edit, task, skill (allow all by default, only deny `everything-search`), todowrite, question, compress.
- **Key constraint:** **It is not the default worker.** It only does the work itself when delegating would cost more overhead than doing it directly; otherwise it dispatches downward, keeping its own context clean of implementation details.

### 2. Explorer (codebase recon)

- **Model:** deepseek-v4-flash (variant max)
- **Role:** Sweeps the codebase fast and returns compressed findings to Orchestrator, so the primary doesn't spend its own context on redundant searches.
- **Tools:** read, glob, grep, bash, compress, skill (only `everything-search` allowed, rest denied).
- **Key constraint:** Read-only: no file edits, no side-effecting commands, no web search. It's a scout; it shouldn't overstep.

### 3. Librarian (external docs research)

- **Model:** deepseek-v4-flash (variant max)
- **Role:** Looks up external docs and third-party library usage, owning "knowledge outside the codebase."
- **Tools:** read, glob, grep, bash, webfetch, the websearch series, the context7 series, the grep_app series, compress.
- **Key constraint:** Distinguishes official docs from third-party blogs/forums, so it doesn't feed stale or non-authoritative content back to the primary as fact.

### 4. Fixer (bounded implementation)

- **Model:** glm-5.2 (variant max)
- **Role:** Takes an already well-defined change request and lands it directly.
- **Tools:** read, glob, grep, bash, edit, compress, skill (only `implement` and `tdd` allowed).
- **Key constraint:** **No requirement discovery, no architecture decisions.** Those should be settled by Orchestrator (or Oracle) before delegation; Fixer only "implements per the plan."

### 5. Designer (UI/UX implementation)

- **Model:** deepseek-v4-flash (no variant)
- **Role:** Interface design and frontend implementation.
- **Tools:** read, glob, grep, bash, edit, compress, skill (only `prototype` allowed).
- **Note:** I barely use this role; it's here for completeness.

### 6. Oracle (architecture & code review)

- **Model:** gpt-5.5 (variant high)
- **Role:** Architecture decisions, risk assessment, debugging strategy, code review.
- **Tools:** read, glob, grep, bash, compress, skill (only `simplify`, `review`, `diagnosing-bugs` allowed).
- **Key constraint:** Read-only, never implements. Keeps "figure out what to do" and "actually do it" strictly separate; no agent that's both referee and player.

### 7. Observer (visual analysis)

- **Model:** MiniMax-M3
- **Role:** Analyzes images, screenshots, charts, and other visual/media content.
- **Tools:** read, glob, grep, compress.
- **Key constraint:** No bash, no file edits, purely a "look at the picture and describe it" role.

Overall there's a clear layering: **Orchestrator dispatches, Explorer/Librarian fetch information, Oracle thinks through the plan, Fixer/Designer land it, and Observer covers multimodal needs.** No agent is a "jack of all trades," and permissions are locked down tight, so each agent's own system prompt stays short, saving even more context.

> **Models are not set in stone.** Swap them anytime based on capability and your own needs. My personal bias: give the Orchestrator a cost-effective but competent model, give Oracle the strongest model you can afford, and drive everything else with cost-first picks. Lately I switched from glm-5.2 to gpt-5.6 luna -- the lineup changes as the landscape does. Pick what works for you.

## Two Hooks: Filling Gaps opencode Doesn't Cover

### 1. image-attachment-hook.js (image attachments)

The primary model (e.g. glm-5.2) isn't necessarily multimodal, but users may send images. This hook intercepts `experimental.chat.messages.transform`, detects image parts in a message (image type / image mime / a filename with an image extension), decodes the base64 data URL and saves it under `.opencode/images/<sessionID>/` (named with the first 8 chars of a sha1 hash + the filename, to avoid duplicate storage), then replaces the original image part with a text nudge telling Orchestrator: "there's an image here, delegate the visual-analysis work to Observer."

So even when the primary model can't read images, the whole flow doesn't stall; image handling is explicitly routed to the only agent that has the capability. It also cleans up images older than 1 hour every 10 minutes, so disk doesn't pile up.

### 2. todo-continuation-hook.js (TODO continuation)

Listens to the `session.idle` event: if the session goes idle but the todo list still has unfinished items (pending / in_progress), it injects a "continue with the next todo, don't stop" prompt after a 2-second countdown, so the agent doesn't knock off halfway.

To keep this mechanism from being unhelpful, it has a pile of guards:

- Skips special agents like compaction / plan
- If a `question` tool call is still unanswered, it doesn't inject (don't interrupt a question being asked to the user)
- If the latest assistant message is stuck on an internal prompt, it doesn't inject
- 5-second cooldown to avoid back-to-back triggers
- Doesn't resume immediately within 3 seconds of a user-initiated abort
- Stops after 3 consecutive rounds with no real progress (stagnation counter)
- Gives up entirely after 5 failures
- Stops outright on an explicit user cancel (`MessageAbortedError`)

Neither hook is a "big feature"; they're patches for specific pain points, small in code and easy to modify. That fits the overall approach: rather than pulling in a kitchen-sink plugin system, I'd rather write a few dozen lines of hook to plug a specific hole.

## A Few Config Details

| Setting | Value |
| --- | --- |
| `default_agent` | Orchestrator |
| `compaction` | auto + prune enabled, using deepseek-v4-pro (variant max) dedicated to context compression |
| `plugin` | `@tarquinen/opencode-dcp@latest`, the DCP (Dynamic Context Pruning) plugin, paired with compaction to clear irrelevant context as early as possible |
| `mcp` | Only websearch (exa), context7, and grep_app, all retrieval capabilities used by Librarian. Any MCP not used is simply not installed |
| `small_model` | deepseek-v3.2-latest, for lightweight tasks (session titles, etc.) |
| `experimental.disable_paste_summary` | `true`: the TUI paste summary has a bug by default; disable it |
| `lsp` | `false`, off when not needed |

**On skill sources:** The `skills` directory shows up a lot in the config. Part of it (implement, tdd, simplify, review, diagnosing-bugs, prototype, etc.) comes from [mattpocock/skills](https://github.com/mattpocock/skills), a high-quality community skill set. The rest (deepwork, the local simplify, everything-search, etc.) are private skills I wrote for my own workflow. I deliberately keep the two categories' authorization separate: **which agent can use which skill is declared explicitly as a whitelist, not "open by default, close as needed."** This is key to saving context and preventing out-of-scope calls: a skill's description itself costs tokens, so for skills an agent won't use, the permission denies them outright and their descriptions never even enter its context.

## Requirements

- OpenCode CLI installed and available as `opencode`.
- Existing provider/model configuration for the configured models (e.g. glm-5.2, deepseek-v4-flash, gpt-5.5, kimi-k2.7-code, deepseek-v4-pro, deepseek-v3.2-latest).

Provider credentials and API keys are not included in this repository.

## Installation

`install.ps1` does a merge-based, non-destructive install. It won't bluntly replace your existing config; `opencode.jsonc` is recursively merged, `AGENTS.md` is prepended to the top of your existing file (never overwritten), and files under `agent/` and `plugins/` are installed one by one. Same-name files are backed up before being replaced, with all backups collected under `.backup/opencode-orchestrator-<timestamp>/` so you can always restore the original if something goes wrong.

Run from this directory:

```powershell
.\install.ps1
```

Preview what would happen without writing anything:

```powershell
.\install.ps1 -WhatIf
```

Install to a custom OpenCode config directory:

```powershell
.\install.ps1 -TargetDir "C:\Users\you\.config\opencode"
```

`-Force` is accepted for backward compatibility but is no longer required; every modification is backed up first, then merged in.

### What gets merged

- **`opencode.jsonc`**: recursively merged into the target. Existing provider/credential/model settings and any other user keys are preserved. On key conflicts the value from this repo wins (e.g. `default_agent`, `agent.*.disable`, `mcp.websearch/context7/grep_app`, `compaction`, `experimental`). Arrays (e.g. `plugin`) are deduped with source entries first. If the target file does not exist, the source config is written as-is. Output is standard JSON (JSONC comments are not preserved). If the target `opencode.jsonc` cannot be parsed, the script aborts without modifying it and asks you to resolve it manually.
- **`AGENTS.md`**: merged to the **top** of the target file. If the target does not exist, the source is copied. If it exists, the source content is prepended, followed by a `---` separator and the original target content. This is idempotent: if the target already starts with the source content, nothing is changed.
- **`agent/`**: installed **file by file**. Each source `agent/*.md` is copied to the target. If a same-name agent file already exists, it is backed up and then replaced with the source version (a safe in-place update of that one agent definition). Names are normalized to exact uppercase-leading filenames such as `Orchestrator.md`, including upgrades from older lowercase filenames. Other existing agent files in the target are left untouched. The target `agent/` directory is never deleted.
- **`plugin/`**: installed **file by file**. The image attachment hook is also explicitly registered from `opencode.jsonc`; it saves pasted/uploaded image data to `.opencode/images/` and replaces the raw image part with a file-path nudge so `Orchestrator` can delegate visual analysis to `Observer` even when the primary model is not multimodal.

### Backups

Before any modification, items that will change are copied into:

```
<TargetDir>\.backup\opencode-orchestrator-YYYYMMDD-HHMMSS\
```

This includes the existing `opencode.jsonc`, `AGENTS.md` (when it is being prepended), any same-name `agent/*.md` files that are being updated or renamed for exact casing, and any same-name `plugin/*.js` files that are being updated. Backups are not created when there is nothing to change (for example, when `AGENTS.md` is already up to date).

The design here follows the same throughline: **changes are controllable, reversible, and previewable.** You shouldn't have to guess what a config touched in your original setup after installing it.

## Background Subagents

Background subagents require this environment variable:

```powershell
$env:OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS="true"
```

To set it persistently for your user account during install:

```powershell
.\install.ps1 -SetUserEnv
```

Or set it manually:

```powershell
[Environment]::SetEnvironmentVariable("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS", "true", "User")
```

Restart your shell after setting the persistent environment variable.

## Try Without Installing

From PowerShell:

```powershell
$env:OPENCODE_CONFIG="opencode-orchestrator\opencode.jsonc"
$env:OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS="true"

opencode agent list
opencode debug agent Orchestrator
```

This mode is useful for validating changes before copying anything into your global OpenCode config directory.

## Verify

```powershell
opencode agent list
opencode debug agent Orchestrator
opencode debug config
```

Expected results:

- `Orchestrator` appears as a primary agent.
- `Designer`, `Explorer`, `Fixer`, `Librarian`, `Observer`, and `Oracle` appear as subagents.
- `default_agent` resolves to `Orchestrator`.

## One Last Thing

A fair chunk of this config is my own workflow habits and self-written skills; the agent division of labor and the hook trigger logic are all shaped by how I actually use opencode day to day. So it's not a "install it and it fits everyone perfectly" config. It's more of a **trimming template**: if you also feel your current setup has too many agents, too many skills, and too-loose tool permissions leaving your context clogged with irrelevant info, you can follow this approach: delete the agents you don't use, tighten each agent's tool permissions down to just enough, and drop the skills you don't need from the whitelist. The context you save beats installing a few more "might-be-useful" agents by a mile.

> [How to make good use of agents](https://zhuanlan.zhihu.com/p/2049543927317935074)
