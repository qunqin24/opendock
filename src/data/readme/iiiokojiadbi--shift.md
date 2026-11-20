# shift

[![npm](https://img.shields.io/npm/v/@iiiokojiadbi/shift)](https://www.npmjs.com/package/@iiiokojiadbi/shift)
[![downloads](https://img.shields.io/npm/dm/@iiiokojiadbi/shift)](https://www.npmjs.com/package/@iiiokojiadbi/shift)
[![license](https://img.shields.io/npm/l/@iiiokojiadbi/shift)](https://github.com/iiiokojiadbi/shift/blob/main/LICENSE)

An agent decides by itself when to **shift**. At a stage boundary it updates its work board and task folders, writes a letter to itself and asks the harness to let the stretch's history go, saying what to hold. Right after the shift its letter, board and current task state come back, and it continues from where it stopped. The agent does not change: only what is in front of it does.

Long work outlives the context window. A harness's own compaction keeps a generic summary of the history, not the agent's line of thought: decisions get lost, and knowledge that was written down is not looked up again. shift keeps the thread on disk, in records strict enough to resume from: a state, not a diary.

Works in [Claude Code](#claude-code) (as a mod), [pi](#pi) (as an extension) and [opencode](#opencode) (as a plugin). A marketplace plugin is available for [Codex](#codex).

## How it works

1. **Records as you go.** The agent keeps `.shift/` in the project: a board (the goal, decisions with their reasons, dead ends), one folder per task with its description and tracker, finished tasks in an archive with an index, the owner's decisions, a glossary, and knowledge by kind.
2. **When to shift.** A soft hint invites the agent to shift at a stage boundary. A final hint tells it to check the records, write its letter and shift immediately. Small windows receive only the final hint.
3. **The letter.** Before a shift the agent writes `letter.md`: where it is, what is next, what is unverified, and what the harness must hold.
4. **The shift.** The agent calls the `shift` tool with `continue` or `wait`. The mod checks the records and refuses on a date, a missing section, a board over 150 lines, tasks out of step or nothing changed. Then it snapshots everything into `.shift/shifts/<time>/` and has the harness let the history go, steered by the letter's Hold.
5. **Back to work.** The next message carries the records, the last shifts in brief and the letter, last. With `continue` the agent goes on by itself. With `wait` it stops, and the letter arrives with the owner's next message.

The session always starts with `SHIFT.md` (where knowledge goes, and a map of the project's docs with their descriptions), `OWNER.md`, `GLOSSARY.md` and `TASKS.md`, so the agent knows what is written down before it needs it.

## Install

### Codex

Requires Bun on PATH and Codex CLI (tested with 0.171.0). Subscribe to stable releases from the repository's marketplace:

```sh
codex plugin marketplace add iiiokojiadbi/shift --ref codex-stable
codex plugin add shift@shift
```

Start Codex with `codex` as usual. In `/hooks`, review and trust the hooks supplied by `shift@shift`, then open a new thread. The first turn receives SHIFT.md with its documentation map. To let the agent initiate a shift, the TUI needs the local app server. If its daemon is stopped, run `codex app-server daemon start` once and reopen Codex. See [Commands](#commands) for the terminal inputs.

For an existing installation pinned to a version tag, change the `ref` line under `[marketplaces.shift]` in your Codex `config.toml` to `ref = "codex-stable"` once. For updates, exit Codex and run:

```sh
codex plugin marketplace upgrade shift
```

Reopen your thread with `codex resume` and review modified hooks in `/hooks`.

### Claude Code

```sh
claude plugin marketplace add iiiokojiadbi/claude-plugins
claude plugin install shift@iiiokojiadbi
```

Restart the session after installing or updating.

### pi

```sh
pi install npm:@iiiokojiadbi/shift
```

### opencode

```sh
opencode plugin add @iiiokojiadbi/shift
```

The same npm package as pi's; opencode 2.x.

## Commands

**Codex terminal.** In the message box, type `$shift` and choose an action with the arrow keys and Tab. Add your request if needed, then press Enter. The plugin hooks must be trusted in `/hooks`.

| Selected action | Result |
|---|---|
| `$shift:unshift review the project` | In a fresh session, the agent receives your request and the latest saved letter with the board and active tasks in the same turn. Omit the request to continue from the letter. |
| `$shift:shift` | Asks the agent to prepare its records and letter and perform a shift. You can add instructions such as `continue`. |
| `$shift:sizes` | Prints estimated token counts by entity and for up to three saved letters. |
| `$shift:tasks` | Prints the current tasks. |

Both reports appear under **Hook stopped**, before any model call. The typed aliases `//unshift`, `//shift`, `//shift_sizes` and `//shift-tasks` also work.

**Claude Code, pi and opencode**

- `/shift [words]` — ask the agent to shift now, hint or not. The words go to it with the ask.
- `/unshift [words]` — in a fresh session, pick up the last shift: the letter, the board and the tasks in progress go to the agent. The words become your message after the letter.
- `/shift-tasks` — list the open tasks and the items of those in progress. The agent is not asked.

## Tools the agent gets

| Tool | What it does |
|---|---|
| `shift` | make a shift: `letter`, `after` (`continue` or `wait`), `about` (one line for the history) |
| `shift_guide` | full guide or one section, `flow` or `records` |
| `shift_sizes` | estimated token table by entity, plus the last three saved letters. For o200k_base counts run `bun run shift:sizes [project]` from the checkout |
| `shift_status` | how full the history is and when the next hint comes |
| `shift_history` | past shifts in brief |
| `shift_setup` | the settings with their values, the checks of the records, the session's files |
| `task_open` / `task_track` / `task_archive` | open a task, set the status of its items by `#id`, archive it |
| `doc_outline` / `docs_mentioning` | a document's sections with line numbers; which documents mention a file |

## Settings

`.shift/settings.toml` is optional. Every key and its default are listed by `shift_setup`.

| Key | Meaning |
|---|---|
| `enabled` | `false` turns the mod off in this project |
| `knowledge` | where knowledge goes: `local` (`.shift/knowledge/`), `project` (the project's docs) or `split` |
| `commit` | `true` lets the project's git take `.shift/` in; by default the mod keeps it out through the local exclude file |
| `[files]` `shift`, `owner`, `glossary` | where `SHIFT.md`, `OWNER.md` and `GLOSSARY.md` live |
| `[files]` `always` | the project's own files loaded whole into every session |
| `[docs]` `dirs` | the folders (8 folders deep at most) and files mapped into `SHIFT.md`; `[]` turns the map off |
| `[docs]` `toc`, `max_pinned`, `max_description`, `max_lines` | document tocs and checks for pins, descriptions and file length |

## Documentation

- [docs/concept.md](docs/concept.md): the idea, the loop, how the model sees it.
- [docs/records.md](docs/records.md): what the agent keeps in `.shift/` and why.
- [docs/hints.md](docs/hints.md): when the mod hints a shift.
- [docs/architecture.md](docs/architecture.md): the core, the ports, where a change goes.
- [docs/adapters.md](docs/adapters.md): each harness's slots and facts.
- [docs/development.md](docs/development.md): commands, tests, installing for development, the release.
- [docs/research.md](docs/research.md): what the design stands on from outside.

`AGENTS.md` holds the map of the repo and the rules for every change.

## License

MIT
