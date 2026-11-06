<p align="center">
  <img src="assets/agentry-lockup.png" alt="Agentry: three stacked bars in orange, violet and green beside the lowercase wordmark" width="360">
</p>

<p align="center">
  <b>Built by one agent. Checked by another. Merged when green.</b><br>
  Agentry is the harness around Claude Code.
</p>

<p align="center">
  <code>0.3.0 · pre-1.0</code> &nbsp;·&nbsp; <code>Node ≥ 24</code> &nbsp;·&nbsp; <code>MIT</code>
</p>

---

Agentry sizes the process to the task, runs each task in its own git worktree against a written contract,
has a second agent check the work, and lands it only after your repo's own checks pass. It remembers what
each run decided, so the next run starts from it. The model stays the same. The conducting around it is the
product.

It is a Claude Code plugin: nine agents, fifteen skills, twenty-two slash commands and one CLI, `agentry`.
Plain Node, no dependencies, nothing to build.

## Who it is for

- You use Claude Code on a real repository and want its work held to a bar: a contract, an independent
  check, your own gate.
- You keep a board (tasks in Markdown) and want each task built, verified and landed the same way every time.
- You want the agent to stop re-deriving last week's decisions.

## How it works

<p align="center">
  <img src="assets/how-it-works.png" alt="The three shapes a task can take: one-shot (implement, verify), spec-first (spec, you approve, build, verify) and decompose plus verify (spec, plan, split, build, verify, assemble)" width="820">
</p>

- **The conductor.** Your main session. `/agentry:go <task>` routes the task to the least process that wins:
  a clear, reversible change goes **one-shot**; an unclear "done" goes **spec-first**; several coupled parts
  go **decompose + verify** (spec, plan, split, build, verify, assemble). It asks you at every fork.
- **A contract per task.** A task names the files it owns, what it exposes and its acceptance. A builder
  that needs a file outside its contract stops and asks instead of reaching across.
- **Lanes in worktrees.** `/agentry:exec <id>` cuts `agentry/<id>` in its own worktree, briefs a builder,
  then an independent verifier, round by round. The builder never works in your main checkout.
- **An independent verifier.** The builder never grades its own work. A fresh verifier checks it against the
  acceptance, with a security lens, and returns a verdict. It does not fix what it finds. Every lane gets
  one by default; the `lean` preset keeps it for flagged items.
- **A recorded gate.** The gate is your repo's own checks, named in `.agentry/workflow.json`. A lane closes
  only on a green gate recorded on its tip, and `/agentry:merge` lands it only past that gate.
- **Memory as `agentry mem`.** Decisions, gotchas and repo facts are kept as plain files, recalled per task,
  and distilled from each run. [More below](#memory).

<p align="center">
  <img src="assets/lanes.png" alt="Three lanes on a board: T-14 runs build, verify, gate and merged; T-16 is fixing a verifier note before a recheck; T-17 is stopped because main moved under it" width="820">
</p>

## Install

Requires Claude Code and Node 24 or newer. From a Claude Code session:

```
/plugin marketplace add silentthreadstudio/agentry#v0.3.0
/plugin install agentry@agentry-dev
```

Restart the session. Agents, commands and skills load at startup, and the plugin puts `agentry` on the
Bash tool's PATH.

`#v0.3.0` pins the install to the 0.3.0 release; `main` moves with development. To move to a later release,
remove the marketplace and add it again with the new tag. Each release is also on
[GitHub Releases](https://github.com/silentthreadstudio/agentry/releases) as a zip.

## First run

```
/agentry:init                                        # learn your board, or scaffold one; never commits
/agentry:go "add pagination to the users endpoint"   # routed, conducted, gated with you
```

With a board and a task whose contract is written:

```
/agentry:start        # where the work stands, and one recommendation
/agentry:exec T-4     # build and verify T-4 in its lane, close on the gate
/agentry:merge T-4    # land it on main; push asks you first
/agentry:close        # drafts to confirm, cleanup, the handoff
```

## Main commands

| Command | What it does |
| :--- | :--- |
| `/agentry:go <task>` | The front door. Routes a task to one-shot, spec-first or decompose + verify, and conducts it. |
| `/agentry:init` | Sets Agentry up for the repo: scaffolds a board or learns the one you have, then wires the lanes. |
| `/agentry:start` · `/agentry:close` | Open and close a session the same way every time. |
| `/agentry:exec <id>` | Builds one contracted task in its lane: worktree, builder, verifier, gate, episode. No merge, no push. |
| `/agentry:merge <id>` | Lands one task: preflight, your checks, cherry-pick, gate, one board commit, push per policy. |
| `/agentry:board` | Derived status, drift and every rule finding. Read-only unless `--apply`. |
| `/agentry:new <kind>` | Adds a task, sprint, question or decision everywhere that kind lives. |
| `/agentry:ask <question>` | One read-only specialist answers with cited sources. No edits. |
| `/agentry:fix <failure>` | A repro-first debug run: reproduce, isolate, fix, leave a regression test. |
| `/agentry:ship` | Branch, commit, PR, CI, merge. Stops before anything leaves the machine. |
| `/agentry:remember` · `/agentry:reflect` | Capture one memory now; curate and distill after a piece of work. |

Every step also runs on its own: `/agentry:spec`, `plan`, `split`, `implement`, `verify`, `assemble`,
`research`, `onboard`, `config`.

Underneath the slash commands is one CLI the agents call, and so can you:

```
agentry board status            # the board: status, check, add, set, fix, …
agentry lane exec show T-4      # the lanes: exec, merge, session, sweep, …
agentry mem recall --query "…"  # the memory store
agentry run --limit 10m -- <cmd>
```

Board writes preview until `--apply`, most commands take `--json`, and every group and subcommand has a
`--help` with its flags, exit codes and an example.

## Configure it

Three files under `.agentry/` say how Agentry works your repo: `process.json` (your board's kinds, columns
and rules), `workflow.json` (the gate, how much checking a lane gets, what it writes, commit rules) and
`config.json` (push policy, builders at once, memory priming). `/agentry:init` writes them from what your
repo already has, and `agentry board explain` shows every value in effect.

- Every key, its default and its effect: [Workflows](https://agentry.silentthreadstudio.com/docs/workflows/).
- Copy-ready setups that pass the loader: [`examples/workflows/`](./examples/workflows/): a solo developer,
  a careful team, a board learned by init, debt only.

## Memory

Memory is the `agentry mem` CLI over plain Markdown files. Nothing runs in the background.

<p align="center">
  <img src="assets/memory.png" alt="First run: no prior decision, so the task goes spec-first and the decision is written down. Next run: the decision is recalled and the task goes one-shot" width="640">
</p>

- **Two roots.** `.agentry/memory/` in the repo's main checkout holds what is true for this repo, reached
  from any of its worktrees. `~/.agentry/memory/` holds what is true across your work (`AGENTRY_GLOBAL_DIR`
  moves it).
- **Files are the truth.** The search index is built with Node's `node:sqlite` in memory on each call and
  never written to disk. No database file, nothing to migrate.
- **Recall is per task.** `agentry mem recall --query "<the task>"` returns a few memories (five by default),
  ranked by relevance × confidence × (1 + usefulness).
- **Writes reinforce.** A write that nearly matches a fact already stored reinforces it instead of copying
  it; `--supersedes <id>` replaces one.
- **Use shapes it.** `agentry mem feedback` raises the memories a passing run used; ones recalled and never
  used decay and are archived after repeated misses (`agentry mem recover` brings one back).
- **Runs become facts.** `/agentry:exec` closes a lane by writing its episode, with the lesson you give it.
  `agentry mem distill` turns episodes into draft facts; `agentry mem consolidate` proposes skills and installs
  nothing.

The verbs: `recall`, `write`, `search`, `feedback`, `episode`, `stats`, `distill`, `consolidate`,
`update`, `forget`, `recover`, `resync`. `agentry mem --help` lists them.

Coming from an earlier version: the memory MCP server is gone. Existing stores read unchanged, same files
and roots.

## Safety model

Nothing lands or leaves the machine without you.

- **Lanes never merge or push.** A builder works on `agentry/<id>` in its own worktree. Landing is a separate
  command, `/agentry:merge`, and it stops at the first red step.
- **Pushing asks.** `merge.push` is `ask` by default: the push runs only with your yes. `/agentry:ship` stops
  at the authorization gate before anything leaves the machine.
- **Your calls stay yours.** When you reject a proposal or state a rule, the conductor drafts it; nothing is
  written as a decision until you confirm. Closing work that already reached main
  (`lane merge <id> --resolve landed`) or a stuck land is your call too.
- **Claude Code's permission prompts still apply.** Agentry runs inside them.
- **Local.** Memory, the board and lane state are files on your machine. The plugin has no telemetry and
  sends nothing anywhere.

## Does it work?

Agentry ships a self-evaluation harness that scores its own routing, decision quality and memory against
controls, from the artifacts of real conducted runs:

```bash
pnpm install && pnpm --filter @agentry/core build
pnpm --filter @agentry/eval selfeval run bench --fixtures-dir fixtures/bench --plugin-dir ../..
pnpm --filter @agentry/eval selfeval report <run-id>    # a self-contained HTML report
```

`--plugin-dir` is the repo root (the folder that holds `plugin/`); paths are relative to `packages/eval`.

> **Read this before `run bench`.** It runs `claude -p` with `--permission-mode bypassPermissions` on your
> machine: the conducted model reads and writes files and runs commands without asking. Each task runs in a
> fresh temp directory, but nothing sandboxes the process from the rest of your system, and every call spends
> API credit (`--budget-usd <n>` caps it). `replay` and `report` make no API calls. Bench results recorded
> before the `--plugin-dir` fix ran without the plugin loaded; do not quote them as measurements of Agentry.

## Status

Pre-1.0. The current release is `0.3.0`. Commands and flags can still change between releases, and
[`CHANGELOG.md`](./CHANGELOG.md) records each change. Claude Code is the host today.

## Docs

The site has the long form: [agentry.silentthreadstudio.com](https://agentry.silentthreadstudio.com/).

- [Quickstart](https://agentry.silentthreadstudio.com/docs/quickstart/) ·
  [Install](https://agentry.silentthreadstudio.com/docs/install/) ·
  [When to use it](https://agentry.silentthreadstudio.com/docs/when/)
- [Lanes](https://agentry.silentthreadstudio.com/docs/lanes/) ·
  [Workflows](https://agentry.silentthreadstudio.com/docs/workflows/) ·
  [Memory](https://agentry.silentthreadstudio.com/docs/memory/) ·
  [Permissions](https://agentry.silentthreadstudio.com/docs/permissions/)
- [Security](https://agentry.silentthreadstudio.com/docs/security/) ·
  [Troubleshooting](https://agentry.silentthreadstudio.com/docs/troubleshooting/)

## Contributing

[`CONTRIBUTING.md`](./CONTRIBUTING.md) has the dev setup and the bar a change is held to. The plugin ships
from `plugin/`; the TypeScript packages under `packages/` (`core`, `web`, `eval`) are dev-only.
`node scripts/check-plugin.mjs` must pass before every commit. Security reports go through
[`SECURITY.md`](./SECURITY.md), not a public issue.

## License

MIT. Built by Esteban Estrada in the [Silent Thread](https://silentthreadstudio.com) Lab.
