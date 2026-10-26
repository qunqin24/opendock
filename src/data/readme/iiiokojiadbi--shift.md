# shift

An agent decides by itself when to **shift**. At a stage boundary it updates its work board and task folders, writes a letter to itself and asks the harness to let the stretch's history go, saying what to hold. Right after the shift its letter, board and tasks in progress come back whole, and it continues from where it stopped. The agent does not change: only what is in front of it does.

Long work outlives the context window. A harness's own compaction keeps a generic summary of the history, not the agent's line of thought: decisions get lost, and knowledge that was written down is not looked up again. shift keeps the thread on disk, in records strict enough to resume from: a state, not a diary.

Works in [Claude Code](#claude-code) (as a mod), [pi](#pi) (as an extension) and [opencode](#opencode) (as a plugin).

## How it works

1. **Records as you go.** The agent keeps `.shift/` in the project: a board (the goal, decisions with their reasons, dead ends), one folder per task with its description and tracker, finished tasks in an archive with an index, the owner's decisions, a glossary, and knowledge by kind.
2. **A hint, not a trigger.** As the history grows, the mod adds a short hint to a tool result: a soft one at intervals, a final one when room runs out. The agent picks the moment itself, at a stage boundary, not in the middle of a thought.
3. **The letter.** Before a shift the agent writes `letter.md`: where it is, what is next, what is unverified, and what the harness must hold.
4. **The shift.** The agent calls the `shift` tool with `continue` or `wait`. The mod checks the records and refuses on a date, a missing section, a board over 150 lines, tasks out of step or nothing changed. Then it snapshots everything into `.shift/shifts/<time>/` and has the harness let the history go, steered by the letter's Hold.
5. **Back to work.** The next message carries the records, the last shifts in brief and the letter, last. With `continue` the agent goes on by itself. With `wait` it stops, and the letter arrives with the owner's next message.

The session always starts with `SHIFT.md` (where knowledge goes, and a map of the project's docs with their descriptions), `OWNER.md`, `GLOSSARY.md` and `TASKS.md`, so the agent knows what is written down before it needs it.

## Install

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

- `/shift [words]` — ask the agent to shift now, hint or not. The words go to it with the ask.
- `/unshift [words]` — in a fresh session, pick up the last shift: the letter, the board and the tasks in progress go to the agent. The words become your message after the letter.
- `/shift-tasks` — list the open tasks and the items of those in progress. The agent is not asked.

## Tools the agent gets

| Tool | What it does |
|---|---|
| `shift` | make a shift: `letter`, `after` (`continue` or `wait`), `about` (one line for the history) |
| `shift_guide` | how to shift and how the records are laid out |
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
| `[docs]` `dirs` | the folders and files mapped into `SHIFT.md`; `[]` turns the map off |
| `[docs]` `toc`, `max_chars`, `max_pinned`, `max_description`, `max_lines` | a toc in each document, and the limits of the map and the documents |

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
