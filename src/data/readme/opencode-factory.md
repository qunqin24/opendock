# opencode-factory

[![CI](https://github.com/whoisandy/opencode-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/whoisandy/opencode-factory/actions/workflows/ci.yml)

A lightweight, opinionated agent pack for OpenCode V2: eight Markdown agents, eight argument-based workflow commands, two skills (`improve`, `context`), a tiny read-only project-context plugin, and an installer CLI (`ocf`). It deliberately does **not** reimplement a full orchestration framework — no background loops, no hooks pipeline, no config mutation.

## What you get

| Agent       | Mode     | Role                                                                                           |
| ----------- | -------- | ---------------------------------------------------------------------------------------------- |
| `foreman`   | primary  | Owns the request end to end: context, plan, delegate, integrate, verify, report with evidence. |
| `machinist` | all      | Deep autonomous investigation and end-to-end implementation. Never commits.                    |
| `sage`      | subagent | Read-only architecture and hard-debugging consultant; adversarial review.                      |
| `explorer`  | subagent | Read-only repository mapping and pattern discovery.                                            |
| `librarian` | subagent | Read-only external documentation and dependency research.                                      |
| `reviewer`  | subagent | Read-only review of a change set and its verification evidence.                                |
| `advisor`   | subagent | Senior advisor: audits, writes handoff plans under `.factory/plans/`, reviews executor work.   |
| `curator`   | subagent | Context steward: maintains verified pattern notes under `.factory/context/`.                   |

Commands are argument-based:

| Command      | Purpose                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `/factory`   | Default pipeline: context → plan/improve → execute → review → verify → learn. |
| `/ultrawork` | Fast path for small, well-understood tasks.                                   |
| `/improve`   | Read-only audit → prioritized findings → handoff plans.                       |
| `/plan`      | Plan lifecycle: `<desc>`, `execute <id-or-file>`, `reconcile`.                |
| `/review`    | Review changes (`code`, `diff`, `commit`, `branch`, `pr`) or `plan <file>`.   |
| `/context`   | Context ops: `map`, `refresh`, `extract <area>`, `validate`.                  |
| `/sage`      | Consult on a hard decision or gnarly bug.                                     |
| `/commit`    | One Conventional Commits commit from the staged change set.                   |

Plugin (`opencode-factory`): exactly one tool, `factory_context`, which reads `.factory/context/navigation.md`, verifies that each referenced file still exists inside `.factory/` (rejecting traversal, absolute paths, external URLs, and symlink escapes), and returns a bounded, relevance-ranked summary. The agent pack works fully when the plugin is absent.

Optional plugin options (object form in `opencode.json(c)`): `contextNudge` — `"off"` (default) or `"warn"`, which posts at most one read-only staleness notice per idle session when the context index has broken references; `builtinAwareness` — default `true`, a runtime-only pointer added to the built-in `plan`/`build` agents when a context index exists (reverts on unload).

## Requirements

- OpenCode V2 (`@opencode/cli` 2.0.x tested against 2.0.18)
- Node.js 20+ **or** [Bun](https://bun.sh) 1.3+ for the installer CLI

The published plugin and installer are runtime-agnostic: they use only `node:` APIs and run under both Node and Bun. Development in this repository is Bun-first (package manager, test runner, lint/format).

## Install

```bash
# into the current project (writes ./.opencode and merges ./opencode.json)
bunx opencode-factory@0.1.0 install      # the installed binary is `ocf`
npx  opencode-factory@0.1.0 install

# preview first
bunx opencode-factory@0.1.0 install --dry-run

# globally (XDG_CONFIG_HOME/opencode or ~/.config/opencode)
bunx opencode-factory@0.1.0 install --global
```

The installer:

1. Prints every change before writing (and `--dry-run` writes nothing).
2. Copies pack-owned Markdown into `.opencode/agents`, `.opencode/commands`, and `.opencode/skills`, and seeds `.factory/context/navigation.md` **only if it does not exist**.
3. Merges `"plugins": ["opencode-factory@<version>"]` into the existing `opencode.json(c)` with a comment-preserving JSONC edit — unrelated settings and other plugins are untouched.
4. Writes `.opencode/.factory-manifest.json` recording each installed file's hash.
5. Backs up any file it replaces under `.opencode/.factory-backups/`.

There is **no `postinstall` script**: installing the npm dependency alone changes nothing.

## Manage

```bash
ocf doctor     # config entry, agent/command/skill presence, context index, plans
ocf update     # idempotent; updates pack-owned files, preserves your edits
ocf uninstall  # removes only manifest-owned, unmodified files and the plugin entry
```

`update` and `uninstall` never overwrite or delete files you have edited; they report them and leave them in place. `--force` replaces non-owned files after writing a backup.

## The context system

- `.factory/context/navigation.md` is a short, curated index. Keep it small; link to focused notes under `.factory/context/patterns/`.
- Agents read the index first and open only the files a task needs.
- `factory_context` verifies references before recommending them and says "no project patterns found" honestly when the index is missing or empty.
- `.factory/plans/` holds handoff plans (index at `.factory/plans/README.md`); the advisor owns them and executors update statuses.
- `AGENTS.md` holds always-applicable project rules; OpenCode V2 loads it automatically.

## Agent permissions

Permission rules use OpenCode V2's native `{ action, resource, effect }` arrays with last-match-wins semantics:

- `foreman` may delegate only to the pack agents.
- `machinist` may delegate only to read-only pack agents and cannot run `git commit`/`git push`.
- `advisor` may write only under `.factory/plans/`; `curator` may write only under `.factory/context/`.
- `sage`, `explorer`, `librarian`, and `reviewer` deny `edit`; shell is denied except for `sage` (ask).
- Destructive shell patterns (`rm -rf`, `git push`, `sudo`, `git reset --hard`) require approval where allowed.

## Development

```bash
bun install
bun run test         # builds, then runs the unit/integration suites (bun:test, scoped to tests/)
bun run typecheck    # tsc --noEmit
bun run check        # oxlint + oxfmt --check
bun run format       # oxfmt .
```

The plugin entry is `dist/index.js`; the installer CLI is `dist/cli.js`. `src/context.ts` contains the read-only context reader shared by both. Built with `tsc`, tested with `bun:test`, linted and formatted with oxlint/oxfmt. CI (`.github/workflows/ci.yml`) runs the format/lint checks, typecheck, build, and test suite on pushes to `main` and on pull requests; publishing is always manual.

## Versioning and changelog

This repository uses [Changesets](https://github.com/changesets/changesets) to version the package and generate `CHANGELOG.md`:

- Record a change: `bun run changeset` — pick the bump type and write a summary; commit the generated `.changeset/*.md` alongside the code change.
- Inspect pending changes: `bun run changeset:status`.
- Cut a version: `bun run changeset:version` — applies pending bumps and updates `CHANGELOG.md`; commit the result.
- Publishing is manual: after a version commit, run `npm publish` (the `prepublishOnly` script builds and tests first). CI never publishes.

## Safety notes

- The plugin is read-only and project-scoped. It never writes and never mutates configuration; the only event-driven behavior is the opt-in `contextNudge` check, which writes nothing.
- The installer previews every change and keeps backups; it refuses to edit malformed `opencode.json(c)` files.
- Removing the plugin directory (or the `plugins` entry) removes only the `factory_context` tool; agents, commands, and ordinary use of OpenCode continue to work.
