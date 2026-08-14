# opencode-evolve

> Turn your agent's mistakes into reusable project skills — manually, safely, and Git-tracked.

[![npm version](https://img.shields.io/npm/v/opencode-evolve.svg)](https://www.npmjs.com/package/opencode-evolve)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![OpenCode](https://img.shields.io/badge/works%20with-OpenCode-9cf.svg)](https://opencode.ai)

`opencode-evolve` is on npm: **[npmjs.com/package/opencode-evolve](https://www.npmjs.com/package/opencode-evolve)**

Your AI coding agent is great at solving *this* task. It's terrible at remembering the lesson next week.

You correct it:

```txt
Don't edit generated files.
Use bun test here, not npm test.
Run Firebase emulators before testing functions.
```

A week later, it forgets. You explain it again. Repeat forever.

**`opencode-evolve` fixes that.** One command captures the lesson into a real file in your repo, so every future session inherits it:

```txt
/evolve remember: this project uses bun test, not npm test
```

No database. No background daemon. No magic. Just plain `SKILL.md` files you review with `git diff`.

---

## Why manual?

Automatic skill-writing sounds cool until the agent confidently writes the *wrong* thing into long-term instructions — at 2am, mid-task, missing the point.

`opencode-evolve` keeps the useful part of self-improvement and puts *you* back in control:

- You decide when a lesson is worth keeping.
- The agent gets scoped tools — no shell tricks, no broad filesystem access.
- Every change is a normal file you can review, commit, or revert like any other code.

That's the whole point: **useful without being spooky.**

---

## Features

- **4 safe tools** for the agent to list, read, patch, and lock skills
- **Exact-match patches** — no risky full-file rewrites, no accidental overwrites
- **Skill locking** — freeze skills you own so they can't be touched
- **Hardened safety** — blocks path traversal, symlink escapes, oversized files, and likely secrets
- **100% Git-tracked** — your agent's project knowledge travels with the codebase
- **Local-only** — no telemetry, no network, no hidden state

---

## Install

Install the package, then add the plugin to your OpenCode config.

```bash
npm install opencode-evolve
```

**Project config** (`.opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-evolve"]
}
```

**Command template** — copy the template into your commands folder:

```txt
templates/evolve.md  ->  .opencode/commands/evolve.md
```

Restart OpenCode. That's it. Now you have `/evolve`.

> Want your team to benefit too? Commit `.opencode/commands/evolve.md` and `.opencode/skills/` to the repo. The agent's smarts ship with the code.

---

## Quick start

The agent keeps running `npm test`, but your repo uses `bun test`.

```txt
/evolve remember: this project uses bun test, not npm test
```

The agent creates or updates a skill:

```txt
.opencode/skills/project-test-workflow/SKILL.md
```

Next session, that workflow is already known — not buried in an old chat. Review it like any change:

```bash
git diff .opencode/skills
```

Like it? Commit it.

---

## How it works

The loop is intentionally tiny:

```txt
correction  ->  /evolve  ->  SKILL.md  ->  better future sessions
```

### The command

`/evolve` tells the agent *when* to update skills. You can point it at a specific lesson:

```txt
/evolve remember: never mix already staged changes with new unstaged edits
/evolve create a skill for our Firebase emulator workflow
/evolve improve git-review-flow with the staged/unstaged rule we just used
/evolve lock git-review-flow
/evolve status
```

### The tools

The plugin gives the agent four scoped tools — nothing more:

| Tool            | Purpose                                   |
| --------------- | ----------------------------------------- |
| `evolve_list`   | List project skills and their status      |
| `evolve_read`   | Read a skill or supporting file           |
| `evolve_edit`   | Create, patch, or edit skill files safely |
| `evolve_policy` | Lock, unlock, or inspect skill policy     |

### Skill storage

Skills live as plain files under:

```txt
.opencode/skills/
```

```txt
.opencode/skills/git-review-flow/SKILL.md
.opencode/skills/testing/bun-workflow/SKILL.md
.opencode/skills/release-checklist/
  SKILL.md
  references/
    manual-release-notes.md
  scripts/
    verify-release.sh
```

A skill can carry supporting files under `references/`, `templates/`, `scripts/`, or `assets/`.

---

## What makes a good skill?

**Keep procedures, not chatter.**

✅ Good — reusable project knowledge:

```txt
Use bun test in this repo.
Never edit these generated files.
Follow this release checklist.
Debug this service in this order.
```

❌ Bad — one-off noise:

```txt
I fixed one typo.
The package manager was temporarily broken.
The API was down today.
```

---

## Safety model

The plugin is deliberately conservative. It protects against:

- Path traversal (`../` escapes)
- Symlink escapes
- Editing locked skills
- Deleting protected files (`SKILL.md`, `.evolve.json`)
- Writing outside allowed support directories
- Oversized support files
- Likely secrets in skill content

Skills are locked via `.evolve.json`. A locked skill stays readable but can't be modified until you unlock it.

---

## Develop

This repo ships a playground for fast local plugin work. The playground plugin imports the source directly:

```ts
export { EvolvePlugin, default } from "../../../src/plugin"
```

```bash
npm install
npm run dev        # launches the OpenCode playground
```

After editing plugin code, restart OpenCode.

```bash
npm test           # bun test
npm run typecheck  # tsc --noEmit
npm run build      # build dist/
npm run pack:check # inspect npm package contents
```

---

## Status

Early project, by design. The goal is to stay *small*:

- one command
- four tools
- project-local skills
- Git-reviewable changes

If a feature turns this into a dashboard, a database, or a framework — it doesn't belong here.

---

## License

[MIT](LICENSE)
