# TokenFreez

[![npm version](https://img.shields.io/npm/v/tokenfreez)](https://www.npmjs.com/package/tokenfreez)
![License](https://img.shields.io/badge/license-MIT-blue)

opencode skills that cut token waste in AI coding sessions. Each skill targets one of
the four ways coding agents quietly burn tokens — so small tasks stop costing big money.

## Why

LLM APIs are stateless: every turn resends the whole conversation as input tokens.
Anything that grows context — long histories, retry loops, broad searches, verbose tool
output — gets paid for again on every subsequent turn. TokenFreez attacks all four.

| Problem | Fix | Component |
|---|---|---|
| History resent every turn grows cost | Freeze session state to a file, restart cheap | [tokenfreez](skills/tokenfreez/SKILL.md) |
| Retry-debug loops multiply cost | Stop blind fixes, hypothesize first, hard budget | [debuglock](skills/debuglock/SKILL.md) |
| Unstructured codebase exploration | Docs first, narrow search, subagent delegation | [scoutlock](skills/scoutlock/SKILL.md) |
| Verbose tool results flood context | Silence, redirect-and-grep, extract the one fact | [outputlock](skills/outputlock/SKILL.md) |
| Narration and code echo during work | Silent `[ ]`/`[x]` checklist output only | [build agent override](.opencode/agent/build.md) |

## Install

Requires [opencode](https://opencode.ai). Published on
[npm](https://www.npmjs.com/package/tokenfreez).

**Version note:** v0.1.1+ contains a self-registering plugin entrypoint that correctly loads all four skills. Earlier versions (0.1.0) had an empty entrypoint — plugin loaded but registered zero skills. If upgrading, restart opencode to pick up the fix.

### Plugin method (recommended)

Add `"plugin": ["tokenfreez"]` to your opencode config:

**Per-project** (creates `.opencode.json` in project root):
```bash
echo '{"plugin":["tokenfreez"]}' > .opencode.json
```

**Global** (enables in every project):
```bash
echo '{"$schema":"https://opencode.ai/config.json","plugin":["tokenfreez"]}' \
  > ~/.config/opencode/opencode.jsonc
```

Then restart opencode. All four skills (`tokenfreez`, `debuglock`, `scoutlock`, `outputlock`) become available automatically.

**Verify installation:**
```bash
opencode debug skill | grep -E "debuglock|scoutlock|outputlock|tokenfreez"
```

### Manual copy (alternative)

For projects without npm access, manually copy:

```bash
mkdir -p .opencode/skills
cp -r skills/* .opencode/skills/
```

Optionally add the silent build agent:

```bash
mkdir -p .opencode/agent
cp .opencode/agent/build.md .opencode/agent/
```

Restart opencode after any manual copy.

## Usage

Skills activate automatically from natural language — no slash commands needed. Each skill also triggers proactively when it detects its pattern:

| Say / situation | Skill that kicks in |
|---|---|
| "freeze", "save session", "tokenfreez" | `tokenfreez` writes `FREEZE.md` |
| "masih error", "error lagi", second failed fix | `debuglock` stops blind retries |
| multi-file exploration, "dimana", "carikan" | `scoutlock` reads docs before code |
| install/build/test runs, web lookups | `outputlock` keeps logs out of context |
| (auto-trigger) long tool output accumulated | `outputlock` silences/truncates |
| (auto-trigger) same error 2x fixed unsuccessfully | `debuglock` activates immediately |
| (auto-trigger) 3+ failed searches for same fact | `scoutlock` switches to docs-first |

### Freeze / resume cycle

```
(long session getting expensive)

you: freeze        → AI writes FREEZE.md with state, decisions, next steps
you: /new          → fresh, cheap session
you: resume        → AI reads FREEZE.md — context restored at one file-read price
```

`FREEZE.md` is gitignored by default (via `.gitignore`) so session state never commits.

```
(long session getting expensive)

you: freeze        → AI writes FREEZE.md with state, decisions, next steps
you: /new          → fresh, cheap session
you: resume        → AI reads FREEZE.md — context restored at one file-read price
```

`FREEZE.md` is gitignored by default so session state never gets committed.

## Notes

- Skills are plain markdown (`SKILL.md`) — portable to any tool that uses the same convention.
- scoutlock prefers an Obsidian vault when one is connected; otherwise it falls back to `README.md` / `docs/`.
- The build agent override is opencode-specific.

## License

[MIT](LICENSE) © fdhill
