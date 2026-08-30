# LoopYourself

A framework-agnostic Agent todo plugin. A local issue system whose terminology is
natively aligned with Linear — and when the Linear MCP is enabled in your agent
framework, you manage Linear issues in the very same system.

Agents autonomously drive issues through the full Linear lifecycle (Backlog →
Done): from planning to review to completion.

## Why

You talk to your agent in Linear terms (Backlog, In Review, Done…) — so should
your todo system. LoopYourself keeps issues as plain Markdown in your repo,
runs an **unattended agent loop** over them, and pushes state changes one-way to
Linear through the agent's own MCP connection. The agent never needs a Linear
token; the loop never needs you.

## The model

- **Backlog** — the request pool, *outside* the workflow (like Linear). Issues
  wait for **your** review. Agents never admit Backlog issues themselves.
- **Ready** — the admission gate. `ready` is a **user-only** command: it moves an
  issue into the Active pool and marks it Ready for the agent.
- **Active** — the ordered execution pool (WIP limit, default 1, configurable).
- **Unattended loop** — the agent picks the Active pool head, implements,
  spawns a **SubAgent review gate** before every commit, then flows
  `Ready → Todo → In Progress → In Review → Done`.
- **Circuit breaker** — a failing issue gets at most `maxRounds` (3) review
  retries, then it is marked `Blocked` (local-only) and skipped; consecutive
  Blocked issues stop the whole loop for your attention.
- **Linear link** — one-way push through Linear MCP. Local state is the source
  of truth; pull only when you ask. `statusMap` is mandatory and validated —
  unmapped statuses refuse to push, no silent fallback.

### Hard guarantees

- **Never deletes anything on Linear** — issues, projects, teams, nothing.
  The Claude Code adapter additionally hard-blocks destructive Linear MCP calls.
- **Repository conventions win** — AGENTS.md, your tests, your lint, your CI/CD
  are obeyed by the loop, always.
- **Commit by default, never push** — unless you enable `autoPush`.

## Install

### Claude Code

```text
/plugin marketplace add BoringLink/LoopYourself
/plugin install loopyourself@loopyourself-marketplace
```

Commands appear as `/loopyourself:init`, `/loopyourself:start`, `/loopyourself:stop`,
`/loopyourself:status`, `/loopyourself:ready`, `/loopyourself:pull`,
`/loopyourself:reorder`.

### OpenCode

```sh
opencode plugin @boringlink/opencode-plugin
```

Commands appear as `/loopyourself/init` … `/loopyourself/reorder`; the loop
continues automatically on `session.idle` while it is running.

### Any other agent framework

The core is a zero-dependency Node CLI on npm:

```sh
npm i -g loopyourself   # or: npx loopyourself <cmd>
```

Any agent that can run shell commands and read Markdown can drive it — point it
at [docs/linear-protocol.md](./docs/linear-protocol.md) for the Linear contract.

## Quick start

```sh
cd your-project
loopyourself init                 # creates .loopyourself/ (commit it)
loopyourself create "Fix login timeout"
loopyourself ready LY-001         # YOU admit it (user-only gate)
loopyourself start                # then let the agent loop take over
```

In Claude Code / OpenCode, `/loopyourself:start` does the same and drives the
loop for you.

### Linking Linear

```sh
loopyourself link <team> [project]
```

Then fill `statusMap` in `.loopyourself/config.json` (which Linear workflow
state each local status maps to) and run `loopyourself verify`. Pushes are
refused until the map is complete — by design.

## Layout

```
.loopyourself/
├── config.json        # behavior + Linear scope + statusMap
├── board.md           # rendered two-pool board
└── projects/default/issues/LY-001.md   # one frontmatter file per issue
```

Data is committed to git by default (issues are shared, reviewable history);
gitignore `.loopyourself/` if you prefer local-only. `loop.json` (machine-local
loop state) is gitignored automatically.

## Documentation

- [Terminology (CONTEXT.md)](./CONTEXT.md) — the domain glossary
- [Linear protocol](./docs/linear-protocol.md) — the agent contract for Linear
- [ADRs](./docs/adr/) — key architecture decisions

## License

MIT — see [LICENSE](./LICENSE). Free for personal use; commercial licensing
available on request.
