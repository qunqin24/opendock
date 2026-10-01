# leonard-memento

**Amnesia insurance for your coding agents.**

When a coding agent compacts its context, the summarizer keeps only what it is shown — everything else evaporates. `leonard-memento` is a family of zero-dependency adapters that puts your project's curated Markdown memory index back in at that exact moment, in whatever agent you run: Total Recall, no trip to Rekall required.

> "Now, where was I?" — Leonard, *Memento*

Leonard tattooed the facts on his body so they would outlive his memory loss. The memory index is that tattoo: one per project, inked outside the repo, read by every agent that works in the directory — right before the summary is written.

It is deliberately **not** a memory system: no capture, no retrieval, no LLM calls, no server, no database, zero npm dependencies. The value is the guarantee plus the curation — ~30 lines you can read in half a minute and keep accurate. Nothing to initialize, nothing to forget to run. Dory-proof.

## Why not a memory system?

| | agentmemory / claude-mem / mem0 | **leonard-memento** |
|---|---|---|
| What it is | memory system: capture, storage, retrieval, consolidation | compaction-boundary insurance |
| Content | auto-observations, LLM compression | curated index: one line per fact, maintained by you |
| Runtime | daemon + ports / SQLite + hooks / cloud | **zero**: no server, ports, DB, or LLM calls |
| Dependencies | hundreds of KB–MB | **0 npm deps, ~150 LOC per adapter** |
| Storage | SQLite/JSON/graph, needs a viewer | flat Markdown: grep, git, any editor |
| When context arrives | on retrieval (agent must ask) | **deterministically at compaction time** |

## Packages

| Package | npm | What it is |
|---|---|---|
| `packages/core` | `@leonard-memento/core` | Shared logic + the `memento` CLI |
| `packages/opencode` | `opencode-memento` | OpenCode plugin (V1 + V2), continuity of v1.0.0 |
| `packages/claude-code` | `claude-code-memento` | Claude Code plugin (`SessionStart` × `compact` hook) |
| `packages/codex` | `codex-memento` | Codex CLI plugin (`SessionStart` × `compact` hook) |

## Install

```
npm i -g @leonard-memento/core
memento init <agent>
```

| Agent | `memento init` target | Mechanism |
|---|---|---|
| OpenCode | `opencode` | prints the `opencode.json` plugin config (pattern A: compaction hook) |
| Claude Code | `claude-code` | writes a `SessionStart`/`compact` hook into `.claude/settings.json` (pattern A) |
| Codex CLI | `codex` | writes a `SessionStart`/`^compact$` hook into `.codex/hooks.json` (pattern A) |
| Gemini CLI | `gemini` | `GEMINI.md` `@<index-path>` import line |
| Antigravity CLI | `antigravity` | `AGENTS.md` snippet (Antigravity parses GEMINI.md and AGENTS.md) |
| Crush | `crush` | `~/.config/crush/CRUSH.md` snippet |
| Cursor | `cursor` | `.cursor/rules/memento.mdc` |
| Cline | `cline` | `.clinerules/memento.md` |
| Zed | `zed` | `.rules` |
| Windsurf | `windsurf` | `.windsurf/rules/memento.md` |
| GitHub Copilot | `copilot` | `.github/copilot-instructions.md` |
| Goose | `goose` | `goosehints` |
| Aider | `aider` | prints `aider --read <index-path>` advice |
| Factory Droid | `droid` | `AGENTS.md` snippet |
| Anything else | `generic` | prints the snippet to paste yourself |

All snippet targets are idempotent (marker comments `<!-- memento:begin/end -->`) and never touch content outside their block. `memento init --list` shows what this build supports.

## The memory convention

One flat Markdown tree, outside the repo:

```
~/.config/memento/projects/<hash16>/MEMORY.md   # the index
                                  ├── topic-a.md
                                  └── topic-b.md
```

`MEMORY.md` is one line per fact: `- [[name]] — short description`. Fact files carry front-matter (`name`, `description`, `type`, dates). `hash16` is the first 16 hex chars of sha256 of the project's canonical path, so every agent working in the same directory shares the same tree.

## CLI

```
memento path [--project DIR]    # absolute index path (exit 1 if absent)
memento inject [--project DIR]  # the injection block (silent, exit 0 when absent)
memento init <agent>            # idempotent setup
memento init --list             # supported agents
```

Environment: `MEMENTO_MEMORY_ROOT` overrides the root; `MEMENTO_INDEX_FILE` overrides the index file name.

## Migrating from opencode-memento v1.0.0

Upgrade the package, change nothing else. Your existing tree at
`~/.config/opencode/memento/projects` keeps resolving through the root
fallback chain; new installs default to `~/.config/memento/projects`.
No re-inking required.

## Links

- Predecessor (archived): [opencode-memento](https://github.com/NemeZZiZZ/opencode-memento)
- Release checklist: [RELEASE.md](RELEASE.md)
- Design spec: kept locally (not published with the repo).

## License

[MIT](./LICENSE)
