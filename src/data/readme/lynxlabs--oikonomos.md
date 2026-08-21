# Oikonomos

**The manager protocol for [opencode](https://opencode.ai).**

> **οἰκονόμος** — *steward of the household*, root of the word **economy**
> (**oikos** — house + **nemein** — to manage). By Lynxlabs.

Oikonomos turns your primary opencode agent into a **manager** that runs a squad
of sub-agents: it decomposes non-trivial work into non-overlapping scopes,
dispatches **parallel** developers with self-contained briefs, **demands
proof-of-work** from every return, re-verifies the claims itself, and closes
with a Manager Report that renders — in markdown — **exactly what you will
see**.

One line in your config; everything else self-wires.

```jsonc
// opencode.json
{
  "plugin": ["@lynxlabs/oikonomos"]
}
```

Restart opencode. Done.

---

## What happens on every message

| Surface | What oikonomos does |
|---|---|
| `chat.message` (pre-message hook) | Appends a synthetic **PRE-MESSAGE CHECK** text part to every user message — the manager discipline is re-asserted before *every* turn. Survives compaction and context drift. |
| `experimental.chat.system.transform` | Injects the standing **Manager Protocol** into the primary session. Sub-agent sessions (detected via `Session.parentID`) get the **Developer Return Contract** instead — workers never manage, managers never fake-typed code. |
| `config` | Auto-registers the `developer` sub-agent and appends the shipped `protocol/manager-protocol.md` to `instructions`. Zero manual wiring. |

Kill switch:

```bash
export OPENCODE_MANAGER_PROTOCOL=off
```

## Automation (v0.2)

v0.2 moves the contract from prompt-weighted to machine-enforced.

**Dikastes validator.** Every `task` return from a `developer`/`general`
sub-agent is checked on `tool.execute.after` for the five contract headings —
`## DONE`, `## FILES`, `## VERIFY`, `## PROOF`, `## ISSUES`. A heading absent
outright counts against the return, and `## VERIFY` / `## PROOF` must each
carry at least 30 non-whitespace characters of body — a bare heading is not
evidence. Scouts (`explore`) are exempt — they never sign the contract. A
failing return is **not accepted as done**: the manager's next turn gets ONE
synthetic part (each tool `callID` is bounced at most once):

```
[OIKONOMOS v1] DIKASTES — proof check failed
Developer task '"add rate limiting middleware"' returned without: ## VERIFY, ## PROOF. It was NOT accepted as done. Resume it via task_id and require: ## DONE / ## FILES / ## VERIFY (commands + pasted output) / ## PROOF (rendered artifact) / ## ISSUES.
```

**Quality hook.** If an executable `.oikonomos/check` exists at the repo
root, edited files are ledgered and the check runs inside the manager's next
`chat.message` hook — ahead of the pre-message reminder part — throttled to
one run per 60 s:

| Contract | Value |
|---|---|
| cwd | the repo root (the plugin's session directory) |
| env | `EDITED_FILES` — edited paths relative to the repo root, space-separated |
| timeout | 120 s |
| output | stdout+stderr combined, truncated to 2000 chars |
| cadence | the next user turn after edits; at most one run per 60 s |
| failure | reported as `QUALITY (.oikonomos/check, exit <code>)` — information, never fatal; the turn is never blocked |

Sample: [examples/dot-oikonomos.check](examples/dot-oikonomos.check) — copy to
`.oikonomos/check` in your repo and `chmod +x` it.

**Health line.** One line on stderr, once, at plugin init:

```
[oikonomos] office staffed: proof-check=on quality=found
```

Kill switches — read lazily per call, so a restart picks up changes:

| Env | Effect |
|---|---|
| `OIKONOMOS_PROOF=off` | no Dikastes validation, no correction injection |
| `OIKONOMOS_QUALITY=off` | no file ledger, no quality-hook runs |

## The loop

```
You:  "Add rate limiting to login, with tests"

hook  → pre-message check injected before your text

mgr   → plan: scout (explore) + 2 developers, disjoint files, pinned contract
      → dispatch: ONE message, three parallel task calls

dev A → implements middleware, runs suite, returns contract
dev B → writes tests against the pinned contract, returns contract

mgr   → re-runs the suite itself, reviews both diffs
      → Manager Report: plan · dispatch table · proofs ·
        "Final render — what you will see" · changed files · follow-ups
```

Fully narrated transcript: **[docs/demo-walkthrough.md](docs/demo-walkthrough.md)**.

## The proof-of-work contract

Nobody gets promoted for saying they're done. Every developer's final message
must carry:

```
## DONE   — what actually changed
## FILES  — every path touched + why
## VERIFY — commands run + output pasted verbatim (never "it passed")
## PROOF  — markdown render of the final user-visible artifact
## ISSUES — deviations/blockers, or "none"
```

Proofless returns get bounced back to the agent with the failing sections
named. v0.2 ([roadmap](docs/office-vision.md)) validates the contract in code.

## The squad

| Seat | Agent | Job |
|---|---|---|
| **Oikonomos** | primary agent | manages; talks to you; never delegates your conversation |
| **Tekton** (builder) | `developer` / `general` | executes one scoped brief, returns the contract |
| **Skopos** (watcher) | `explore` | read-only recon; feeds briefs, never edits |

Briefing rule: sub-agents see **nothing** of your conversation, so every brief is
self-contained — GOAL / CONTEXT / SCOPE + DON'Ts / numbered REQUIREMENTS /
VERIFY commands / RETURN format. Scope conflicts between agents are treated as a
*management* failure and re-briefed, not merged over.

## What it deliberately does NOT do

- Trivial questions and single small edits are answered **directly**. You don't
  call a meeting to move a stapler.
- The v0.2 validator checks that contract sections exist — and that VERIFY /
  PROOF carry real bodies — but it does not re-run your VERIFY commands or
  diff your FILES. Judging the bodies stays with the manager.
- Your project rules win: any repo `AGENTS.md` (test discipline, style,
  founder rulings) **overrides** the protocol.

## The office

Oikonomos is the first staffed seat of a bigger bet: an **office for agents** —
HR that remembers which briefs succeed (Mnemosyne), a reviewer seat (Dikastes),
a runner for long suites (Hemerodromos), managers of managers (Archon).
Honest roadmap, Greek lexicon, work-culture rules, and the v1.0 org chart:
**[docs/office-vision.md](docs/office-vision.md)**.

## Files

```
src/index.ts                  the plugin (config, chat.message, system/messages.transform, tool.execute.after, event hooks)
protocol/manager-protocol.md  the full manager protocol (auto-added to instructions)
agents/developer.md           file-form developer sub-agent (also auto-registered inline)
docs/demo-walkthrough.md      end-to-end transcript: delegation path + no-delegation path
docs/office-vision.md         the Lynxlabs office: roles, culture, roadmap, org chart
examples/dot-oikonomos.check  sample quality hook — copy to .oikonomos/check in your repo (chmod +x)
```

## License

MIT © Lynxlabs
