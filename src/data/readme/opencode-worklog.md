```
 ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗██╗      ██████╗  ██████╗ 
 ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██║     ██╔═══██╗██╔════╝ 
 ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ██║     ██║   ██║██║  ███╗
 ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ██║     ██║   ██║██║   ██║
 ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗███████╗╚██████╔╝╚██████╔╝
  ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ 
```

<div align="center">

**Cross-session work management for AI agents. Your todos survive. Your decisions persist. Your context comes back.**

[![npm](https://img.shields.io/npm/v/opencode-worklog)](https://www.npmjs.com/package/opencode-worklog)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![works with opencode](https://img.shields.io/badge/works%20with-opencode-black)](https://opencode.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![runtime: bun](https://img.shields.io/badge/runtime-bun-fbf0df?logo=bun&logoColor=black)](https://bun.sh)

</div>

---

## The problem

OpenCode sessions are stateless. Every context compaction or restart wipes the agent's working memory — todos vanish, blockers disappear, half-finished decisions evaporate. You're left re-explaining context that was perfectly documented ten minutes ago.

`opencode-worklog` fixes this. It persists todos, blockers, and decisions to disk, then automatically injects them back into context at compaction time. Work in progress survives session resets.

---

## What it does

An OpenCode plugin (`index.ts`) that hooks into two lifecycle events:

1. **On session start** — bootstraps the `.worklog/` directory structure in the project root (idempotent; safe to run repeatedly)
2. **On session start** — auto-installs 6 skills to `.opencode/skills/` (skips any already present)
3. **On context compaction** — reads open todos and active blockers from disk, injects them into the compaction payload so they land in the next session's context

---

## How it works

```
Session Start
     │
     ├──► Bootstrap .worklog/ directory structure
     │
     └──► Auto-install skills to .opencode/skills/
                │
                ▼
         Inject system prompt:
         "use /worklog, /worklog-todo, /worklog-decide…"
                │
                ▼
          [ work happens ]
                │
                ▼
     Context Compaction
                │
                └──► Read todos.json + blockers.md
                          │
                          ▼
                   Inject into compaction payload
                          │
                          ▼
                  Open work survives reset ✓
```

---

## Install

Add to `opencode.json` in your project root:

```json
{
  "plugins": ["opencode-worklog"]
}
```

That's it. On the next session start the plugin bootstraps `.worklog/` and installs the skills automatically. No further configuration needed.

### Local / development

```json
{
  "plugins": ["file:../opencode-worklog"]
}
```

> **Peer dependency:** `@opencode-ai/plugin`  
> **Runtime:** Bun (OpenCode's native runtime)

---

## Skills reference

Six skills are installed to `.opencode/skills/` automatically. Invoke them by slash command or by describing what you want to the agent.

| Skill | Triggers | Purpose |
|---|---|---|
| `worklog` | `/worklog` · `/worklog checkpoint` · `/worklog end` | Session dashboard, mid-session checkpoint, close-out summary |
| `worklog-todo` | `/worklog-todo add <title>` · `list` · `done <id>` · `drop <id>` | Cross-session todo list backed by `.worklog/todos.json` |
| `worklog-archive` | `/worklog-archive` | Move done/dropped todos to `todos.done.json` |
| `worklog-blocker` | `/worklog-blocker add <title>` · `resolve <id>` | Record and resolve blockers and open questions |
| `worklog-decide` | `/worklog-decide` | Lightweight ADR appended to `.worklog/decisions.md` |
| `worklog-docs` | `/worklog-docs` · `new adr` · `new report` · `new research` | Full ADR, formal report, and research note management |

---

## `.worklog/` layout

```
.worklog/
├── todos.json          ← active todos (JSON array)
├── todos.done.json     ← archived done/dropped todos
├── blockers.md         ← open questions and blockers
├── decisions.md        ← lightweight ADRs (ADR-001…)
├── sessions/           ← daily session files (YYYY-MM-DD.md)
├── adrs/               ← pre-decision technical research
├── reports/            ← formal investigation reports
└── research/           ← quick audit notes

docs/
└── adr-NNN-*.md        ← full formal ADRs (committed, permanent)
```

---

## Gitignore recommendations

```gitignore
# Session files are noisy — safe to ignore
.worklog/sessions/

# Auto-installed skills — reinstalled each session start
.opencode/skills/worklog
.opencode/skills/worklog-todo
.opencode/skills/worklog-archive
.opencode/skills/worklog-blocker
.opencode/skills/worklog-decide
.opencode/skills/worklog-docs
```

**Worth committing:** `.worklog/todos.json`, `.worklog/decisions.md`, `.worklog/blockers.md`, and everything under `docs/`. These are your persistent project memory.

---

## Contributing

PRs and issues welcome on [GitHub](https://github.com/lgarceau768/worklog). Keep it small — this plugin is intentionally minimal.

---

## License

MIT
