# opencode-ultracode

[![npm version](https://img.shields.io/npm/v/opencode-ultracode.svg)](https://www.npmjs.com/package/opencode-ultracode)
[![license](https://img.shields.io/github/license/polatdev/opencode-ultracode.svg)](https://github.com/polatdev/opencode-ultracode/blob/main/LICENSE)

Multi-agent workflow orchestration for [opencode](https://opencode.ai). The model
writes a small JavaScript script that fans a task out across phases of parallel
sub-agents, and you watch, pause, resume and stop the run from a live
`/workflows` view inside the TUI.

It's a plugin, not an MCP server, not a separate app. There is **no daemon and
no service** to run — the engine lives inside your opencode process, sub-agents
are ordinary opencode child sessions, and progress is written to a state file
the TUI polls.

```
╭ ⠋ audit-payments ──────────────────────────────────────────────────────────╮
│ phases                    │ agent           model     ctx    tools    time │
│ ● 1 Scan          12/12   │ ✓ find:webhooks sonnet-4  38k    6 tools  41s  │
│ ● 2 Verify        18/24   │ ⠋ verify:idem-2 sonnet-4  21k    3 tools  12s  │
│ ○ 3 Synthesize     0/1    │ ⠋ verify:idem-3 qwen3.8   17k    2 tools   9s  │
│                           │ ○ verify:retry-1 sonnet-4                      │
├────────────────────────────────────────────────────────────────────────────┤
│ ⠋ verify:idem-2           │ grep done · src/Services/Payment        3s ago │
╰────────────────────────────────────────────────────────────────────────────╯
 ↑↓ agent  ←→ pane  ⏎ open agent  r result  x stop  p pause  s save  esc back
```

## Why

Some tasks do not fit one context: auditing every handler in a large codebase,
migrating dozens of files, reviewing a big diff from several angles, or
research that needs independent verification before you trust it. A single
agent either runs out of context or quietly narrows the job.

`opencode-ultracode` gives the model a `workflow` tool that decomposes such a
task into phases of parallel sub-agents with structured outputs, asks you to
approve the plan, runs it in the background, and delivers the result back into
your session when it is done. You get a live view of every agent, its model,
context size, tool calls and thinking, and you can stop or pause at any point.

## Install

The package ships two entrypoints: the **server plugin** (the tool and the
engine) and the **TUI plugin** (the `/workflows` screens). Each goes in its
own config file.

Server plugin — add it to `opencode.json` (global `~/.config/opencode/opencode.json`
or per-project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-ultracode"
  ]
}
```

TUI plugin — add the same package to `tui.json` (global `~/.config/opencode/tui.json`
or per-project `.opencode/tui.json`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "opencode-ultracode"
  ]
}
```

opencode installs npm plugins automatically at startup — there is nothing to
`npm install` yourself. Restart opencode and `/workflows` opens the run list.

### From a checkout

To run the plugin from source instead, point both config files at the entry
files:

```json
// opencode.json
{ "plugin": ["/path/to/opencode-ultracode/src/server/index.ts"] }
```

```json
// tui.json
{ "plugin": ["/path/to/opencode-ultracode/src/tui/index.tsx"] }
```

## How it works

Ask for it in plain words. Any of these make the model call the tool right away:

> run a workflow that audits every payment handler for missing idempotency checks
>
> ultracode: migrate all repositories from Doctrine to Eloquent

For a large task you did not phrase this way, the model recommends a workflow
(phases and rough agent count) and waits for your go-ahead.

1. The model authors a script, or picks a saved one, and calls `workflow`.
2. opencode shows a permission prompt with the plan: name, description, phases.
3. The run starts in the background. Open `/workflows` to watch it.
4. When the run finishes, its result arrives as a new turn in the session that
   started it.

Sub-agents run in their own child sessions with the project's tools and
permissions. When one of them is blocked on a permission or a question, the
workflow views flag it and let you answer without leaving the screen.

For unattended runs you can have the plugin approve sub-agent permission
prompts automatically. This is off by default and controlled by an environment
variable when you start opencode:

```sh
ULTRACODE_AUTO_ALLOW=1 opencode            # approve every permission sub-agents ask for
ULTRACODE_AUTO_ALLOW=bash,edit opencode    # approve only these permission types
```

Only workflow sessions are affected: the sub-agent sessions themselves and any
session they open in turn. Your chat session and the plan
approval prompt still ask as usual, and questions from sub-agents are still
routed to you. Every auto-approval is written to the opencode log.

### When an agent fails

A failed agent does not silently hand `null` to the script. The run keeps
going for everyone else, but the script waits for that one result while you
decide in `/workflows`:

- `R` **retries the agent in its own session**: the last error and an
  optional note from you are appended as a follow-up message, so the agent
  continues from where it was instead of starting over (a research agent that
  made 100 tool calls keeps all of it).
- `X` **skips it**: the script gets `null`, as before.

You can also act on a healthy agent: `P` pauses just that agent (its session
is kept) and resumes it, `X` stops it, and `R` on a running agent interrupts it
and continues it with your note when it is heading the wrong way. The run-level
`p`/`x` keys are unchanged.

Automatic retries still happen first (a structured-output agent gets two
attempts); every retry is a follow-up in the same session. To restore the old
behaviour and have failures resolve to `null` immediately, start opencode
with `ULTRACODE_HOLD_FAILED=0`.

If opencode exits while a run is in progress, the run is not lost. Every
completed agent is journaled, so resuming replays those results; agents that
were still running, paused or failed continue **in their own sessions** rather
than from scratch. `R` on a failed agent of a stopped or even completed run
resumes the run and continues that agent with your note; agents whose input
changes as a result re-run, the rest replay.

### The `workflow` tool

| Argument      | Meaning                                                             |
|---------------|---------------------------------------------------------------------|
| `script`      | Inline workflow script                                              |
| `scriptPath`  | Path to a script file                                               |
| `name`        | Saved workflow from `.opencode/workflows/<name>.js`                 |
| `args`        | Value exposed to the script as `args`                               |
| `resumeRunId` | Resume a stopped run, or one whose engine died, by its run id       |
| `retryAgentId`| With `resumeRunId`: one failed agent (e.g. `ag-002`) to continue in its session; also works on a completed run |
| `retryNote`   | With `retryAgentId`: a note for that agent about what to fix       |

### Writing a script

Scripts are plain JavaScript. They begin with a pure-literal `meta` block and
then use the primitives below. The bundled `workflow-authoring` skill teaches
the model the full format and the quality patterns; it is registered
automatically in every project the plugin is loaded in.

```js
export const meta = {
  name: 'review-changes',
  description: 'Review changed files across dimensions, verify each finding',
  phases: [{ title: 'Review' }, { title: 'Verify' }, { title: 'Synthesize' }],
}

const FINDING = { type: 'object', properties: { findings: { type: 'array' } }, required: ['findings'] }
const VERDICT = { type: 'object', properties: { isReal: { type: 'boolean' }, why: { type: 'string' } }, required: ['isReal'] }

const dims = [
  { key: 'bugs', prompt: 'Review the current diff for correctness bugs…' },
  { key: 'perf', prompt: 'Review the current diff for performance problems…' },
]

// pipeline: each dimension moves on to Verify as soon as its own Review is done
const verified = await pipeline(
  dims,
  d => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDING }),
  r => parallel((r?.findings ?? []).map(f => () =>
    agent(`Try to REFUTE this finding: ${JSON.stringify(f)}`, { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT })
      .then(v => ({ ...f, verdict: v }))
  )),
)

phase('Synthesize')
const confirmed = verified.flat().filter(Boolean).filter(f => f.verdict?.isReal)
log(`${confirmed.length} confirmed findings`)
return await agent(`Write the final report for these findings: ${JSON.stringify(confirmed)}`, { label: 'report' })
```

| Primitive                    | What it does                                                                                                                                                         |
|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `agent(prompt, opts?)`       | Spawns a sub-agent in its own session. Resolves to the schema-validated object or the final text; `null` when the agent is stopped or when the user skips a failed agent (see above). `opts`: `label`, `phase`, `schema`, `model`. |
| `parallel(thunks)`           | Runs `Array<() => Promise>` concurrently and waits for all of them. A throwing thunk becomes `null`.                                                                 |
| `pipeline(items, ...stages)` | Runs each item through every stage independently, with no barrier between stages. The default choice.                                                               |
| `phase(title)`               | Starts a display phase. Use the same titles as `meta.phases`.                                                                                                        |
| `log(message)`               | Narrator line shown in the run view.                                                                                                                                 |
| `args`                       | Whatever the tool call passed as `args`.                                                                                                                             |
| `budget`                     | `{ total, spent(), remaining() }`. `agent()` throws once `total` is reached.                                                                                         |

Scripts have no filesystem, network or Node APIs. `Date.now()`, `Math.random()`
and no-arg `new Date()` throw so a resumed run replays deterministically.
Concurrency is capped at roughly `min(16, cpus - 2)` agents at a time and
1000 agents per run.

## The `/workflows` TUI

| Screen       | Keys                                                                                                                                              |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Run list     | `↑↓` select · `⏎` open · `r` result · `x` stop · `p` pause / resume · `s` save script · `d` delete · `esc` back                                    |
| Run view     | `↑↓` phase or agent · `←→` switch pane · `⏎` open · `r` result · `x` stop · `p` pause / resume · `s` save · `!` answer a pending permission · on the selected agent: `R` retry · `P` pause / resume · `X` stop / skip |
| Agent detail | `↑↓` scroll · `←→` previous / next agent · `e` show tool and thinking previews · `p` expand prompt · `⏎` answer a permission or question · `R` retry / steer · `P` pause / resume · `X` stop / skip |
| Result view  | `↑↓` scroll · `g` top                                                                                                                             |

The agent detail shows a **Live** feed while the agent runs (text, thinking
marked `∴`, tool calls marked `⚙`, newest first), the prompt, an **Activity**
list with one row per tool call and per thinking block with its duration, and
the final outcome.

```
Activity · 3 tools · 2 thoughts                                 e shows previews
✓ grep    /Users/me/PhpstormProjects/payzink-api                             0s
✓ think   Retry logic lives in the webhook handler, so the idempotency…     16s
✓ read    src/Services/Payment/RetryService.php                              1s
⠋ think   Comparing the two idempotency checks…                              3s
```

Thinking rows appear only when the provider streams reasoning. With thinking
disabled the list holds tool calls only.

### Where things live

| Path                                                 | Contents                                                                                                   |
|------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| `/tmp/opencode-workflows/<project>-<hash>/<runId>/`  | Run artifacts: `state.json`, `journal.jsonl`, `script.js`, `control.json`. Scratch data, safe to delete.  |
| `<project>/.opencode/workflows/<name>.js`            | Saved workflows (`s` in the TUI). Project assets; commit them if you like.                                 |

The TUI polls `state.json` and merges it fine-grained, so only changed cells
redraw. Pause, resume and stop (for the run, or with an `agentId` and an
optional `note` for one agent) are written to `control.json` and picked up by
the engine.

## Requirements

- opencode `>= 1.3.4`
- Node.js >= 22 (only matters if you're developing the plugin itself; end
  users just add it to `opencode.json` and `tui.json`)

## Development

```bash
npm install
npm run typecheck      # tsc --noEmit
npm run test:runtime   # engine self-test against a mock opencode client
```

```
src/
  server/index.ts    server plugin: workflow tool, triggers, system guidance, usage tracking
  runtime/engine.ts  run engine: agents, phases, journal, resume, state file
  runtime/script.ts  script parsing and the deterministic sandbox
  runtime/schema.ts  structured-output schema handling
  tui/index.tsx      TUI plugin: /workflows routes and keymaps
  tui/store.ts       state.json polling and fine-grained merge
  tui/requests.ts    pending permission / question tracking for sub-agents
  shared/            types and formatting shared by both plugins
skills/workflow-authoring/SKILL.md
```

## License

MIT © [Abdulkadir Polat](https://github.com/polatdev)
