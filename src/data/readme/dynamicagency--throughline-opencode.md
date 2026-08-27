# throughline

**Continuous, state-aware session memory for Claude Code, Codex CLI, and OpenCode.**
Captures what you *did* and what *is* - commands, file changes, decisions, live git/PR
state - then hands it off with judgment when the session wraps. Your artifacts stay
readable, editable, and yours.

---

## Why throughline

Most "memory" tools for AI agents replay the *conversation*. throughline captures the
**work and the state**, separates cheap automatic capture from deliberate curated
handoff, and binds into Claude Code's native memory system.

| | conversation-replay tools | **throughline** |
|---|---|---|
| What it captures | chat transcript, lossy summaries | **actions + state** - commands, files, decisions, git/PR |
| Capture vs. distill | one lossy step | **separated**: continuous capture, judged handoff |
| Project state | none | **live git/branch/PR/issue** at load |
| Artifacts | opaque blobs | **human-readable, editable, plain text** |
| Storage | per-machine, pollutes git | **local by default**, clean gitignore, commit when you choose |
| Native memory | ignored | **binds** to Claude Code's memory (curated promotion) |

### Why not just...

- **a manual `HANDOFF.md`?** You have to remember to write it, and you write it
  from memory, which after a long session is itself reconstructed from a compacted
  transcript. throughline captures continuously and distills from a buffer that
  does not forget.
- **`CLAUDE.md`?** That is for durable preferences and project conventions, the
  things that are true every session. throughline is for per-session work state:
  what you did today, where you stopped, what is still open.
- **native `/memory`?** Native memory holds global facts. throughline holds
  project work state and live git/PR/issue context, and it *promotes* the genuinely
  durable facts up into native memory rather than competing with it.

## How it works

Five capture points, each doing what it's actually capable of. Every harness wires
all five to its own hook/event API - the mechanism differs, the behavior doesn't:

| Capture point | What it does |
|---|---|
| **Session start** | Injects a HANDOFF.md pointer + live git state into context. Mechanical and cheap. |
| **User intent** | Appends a redacted, truncated one-liner per prompt to the per-session buffer - the "why" behind the work that otherwise lives only in the (compactable) conversation. |
| **Action** | Appends a structured one-liner per captured action: the command, file, search, fetch, or delegated task, flagged if it was interrupted, with obvious secrets masked before anything is written. Mutating actions (bash/edit/write) plus high-signal read-side actions (grep/fetch/search/delegated tasks) and MCP tool calls are captured; the noisiest (plain file reads/globs) are deliberately skipped so the buffer stays skimmable. |
| **Compaction boundary** | Stamps a marker into the buffer at the moment of compaction, so a later handoff knows to distill the actions above it from the buffer text rather than from summarized conversation recall - and re-injects the buffer's tail into context right after, so the current session doesn't lose its own recent history to the compaction. |
| **Session end** | A safety-net stamp so a session that ended without a handoff is surfaced next time for retroactive distillation. Nothing is ever silently lost. |

You never see any of this directly; it just protects you. The judgment sits one
layer up, in the **`handoff` skill**: at wrap-up, the agent distills the buffer +
context into a durable `HANDOFF.md` and a timestamped session log, and promotes any
durable facts into native memory (where the harness has one). It runs proactively
at detected wrap-up and reports the diff for your review. The **`onboard` skill**
does the full orientation pass (open PRs/issues, deep read) on demand.

<details>
<summary>Per-harness mechanism (click to expand)</summary>

| Capture point | Claude Code / Codex CLI | OpenCode |
|---|---|---|
| Session start | `SessionStart` hook | `session.created` event + `experimental.chat.system.transform` |
| User intent | `UserPromptSubmit` hook | `chat.message` hook |
| Action | `PostToolUse` hook | `tool.execute.after` hook |
| Compaction boundary | `PreCompact` hook, then `SessionStart` re-fires with `source=compact` | `session.compacted` event, which queues the recovery block for the next context injection |
| Session end | `SessionEnd` hook | `session.idle` event (fires after every turn, not once at exit - see [OpenCode](#opencode)) |

Claude Code and Codex CLI share the identical shell hook scripts; OpenCode's plugin
is a TypeScript port of the same logic against OpenCode's own API.

</details>

And over months, the same lesson can appear in session log after session log without
ever graduating. The `consolidate` skill is the periodic pass (monthly,
or on demand) that mines the handoff logs for lessons recurring 2+ times and proposes
promoting each one - to a global CLAUDE.md rule, an issue on the owning skill's
source repo, a durable project section, or native memory - with every promotion
gated on explicit per-item approval. Session logs stay untouched as historical
records; only the durable copy moves.

## Surviving compaction

When a long conversation gets compacted, the transcript is summarized and detail is
lost. throughline is built around that fact:

- **The raw action buffer survives**, because it lives on disk, appended after
  every action, independent of the context window.
- **A boundary marker is stamped** into the buffer at the moment of compaction, so
  a later handoff can see the seam and knows to distill the actions above it from
  the buffer text rather than from summarized recall.
- **The buffer's tail is re-injected into context right after**, so the session
  doesn't lose its own recent history to the compaction it just went through.

Honest scope: the **what** (commands run, files changed) is compaction-proof; the
**why** (decisions, dead ends) lives in the conversation and is what compaction
discards. Run a handoff before a long session compacts to preserve the reasoning,
and the boundary marker flags where recall stops being trustworthy.

## Choose your harness

Every harness reads and writes the same `.claude/throughline/` data format, so a
project's history stays readable and continuable no matter which one you install into.
Claude Code has the most native integration (it binds into Claude's own memory
system); Codex CLI and OpenCode both get full automatic capture through their own
hook/plugin APIs. Capabilities differ in the details below - see the table for the
honest comparison, then jump to the section for your harness.

| | [Claude Code](#claude-code) | [Codex CLI](#codex-cli) | [OpenCode](#opencode) | [npx skills](#npx-skills) |
|---|---|---|---|---|
| Skills (`handoff`, `onboard`, `consolidate`, `consolidate-memory`) | yes | yes | separate install (see below - broadly auto-discovered) | yes |
| Automatic capture | yes - 5 hooks | yes - 5 hooks, one-time trust step (see below) | yes - 5 hooks | no |
| Compaction survival | yes | yes | yes | no |
| Native memory binding | yes (Claude's `/memory`) | no | no | no |
| Requires `jq` | yes | yes | no | n/a - skills only |

### Claude Code

```
/plugin marketplace add dynamic/throughline   # register this repo as a marketplace
/plugin install throughline@throughline        # install plugin@marketplace (same name)
```

Then reload (`/reload-plugins`) or restart the session.

**Requirements:** `git` and `jq` on your `PATH`. `jq` parses the hook payloads; if it
is missing, capture cannot run and the SessionStart block says so rather than failing
silently.

**What you get:** the 4 skills (`handoff`, `onboard`, `consolidate`,
`consolidate-memory`) plus all 5 hooks. The only harness with a native durable
memory system of its own (`/memory`, backed by `MEMORY.md`) - the session-start
injection above complements that auto-load with project-level state, and the
`handoff`/`consolidate-memory` skills promote genuinely durable facts into it.
Codex and OpenCode have no equivalent system to bind into today.

**Updating.** Installed plugins are snapshots - they do not track this repo. An old
copy keeps running (without newer redaction and activation fixes) until you update it
from the `/plugin` manager (or uninstall and reinstall), then `/reload-plugins`. The
SessionStart block prints the running version (`## throughline vX.Y.Z`) - if it lags
this repo's releases, your install is stale.

### Codex CLI

```sh
codex plugin marketplace add dynamic/throughline
codex plugin add throughline@throughline
```

**Requirements:** `git` and `jq` on your `PATH`, same as Claude Code - Codex runs
the identical hook scripts. Without `jq`, capture cannot run. Works in Codex CLI and
Codex Desktop.

**What you get:** the 4 skills plus all 5 hooks, reading and writing the same
`.claude/throughline/` data format Claude Code and OpenCode use - so a project's
history is readable and continuable from any of the three.

**The one-time trust step.** Codex gates hook execution behind a one-time trust
decision per machine (Claude Code has no equivalent gate - a plugin's hooks just run
once installed). What that looks like the first time you use a project with
throughline installed:

- **Codex CLI** shows a native **"Hooks need review"** dialog before your first
  message: "5 hooks are new or changed. Hooks can run outside the sandbox after you
  trust them." Choose **"Trust all and continue."** That's the whole step - trust is
  granted by content hash, not by project path, so it covers every project at once.
  A throughline update that changes the hook scripts triggers the dialog again.
- **Codex Desktop** grants trust silently, with no dialog - capture just starts
  working on your first message.

Verify anytime with the in-TUI **`/hooks`** command: it lists every Codex hook event
with an Installed/Active count, and pressing Enter on a row shows that hook's
`Source`, `Command`, `Mode`, `Timeout`, and `Trust` status. A trusted throughline
hook reads `Source: Plugin - throughline@throughline`, `Trust: Trusted`.

**Updating.** Same story as Claude Code: an installed plugin is a snapshot, not a
live checkout. Update from `codex plugin add throughline@throughline` again (or the
Codex plugin manager) to pick up the latest release - a throughline update also
changes the hook scripts' content hash, so the trust dialog reappears once on Codex
CLI.

### OpenCode

throughline is also available as an OpenCode plugin, providing the same session
capture functionality within the OpenCode ecosystem.

```json
{
  "plugin": ["@dynamicagency/throughline-opencode"]
}
```

OpenCode's plugin config key is `plugin` (singular) in `opencode.json`, and each
entry is either an npm package name or a local path - there is no separate
`plugins/` directory to copy into. Add the line above and restart OpenCode; it
installs the package automatically via Bun at startup. Check
`~/.local/share/opencode/log/opencode.log` for a load error if session capture
doesn't appear to be running.

**Requirements:** Node.js 18+ (no `jq` required - TypeScript uses native JSON
parsing).

**What you get:** all 5 hooks, ported to TypeScript against OpenCode's own plugin
API - continuous prompt/action capture with redaction, session-start context
injection (HANDOFF.md pointer + live git state), and compaction survival (a boundary
marker plus buffer-tail re-injection right after). One behavioral difference worth
knowing: OpenCode's `session.idle` event fires after every turn, not once at process
exit the way Claude Code's `SessionEnd` does, so the buffer's end-marker is a "last
known idle point" that gets re-stamped each time the session goes idle, rather than
a one-shot end-of-session stamp - `onboard` reads it the same way either way (has
this buffer seen activity since the marker). This plugin ships **hooks only,
no skills** - OpenCode's own plugin API has no supported way to ship a skill
directory alongside a plugin today. Run `npx skills add dynamic/throughline`
separately for `handoff`/`onboard`/`consolidate`/`consolidate-memory`. In practice
this is often a non-issue: OpenCode discovers `SKILL.md` files from several
locations it shares with Claude Code and Codex (project-local and global
`.claude/skills/`, `.agents/skills/`, and its own `.opencode/skills/` /
`~/.config/opencode/skills/`), so skills installed for another harness on the same
machine are frequently already visible to OpenCode with no extra step.

By default the OpenCode plugin uses the same `.claude/throughline/` data directory
as Claude Code and Codex, so a project's history stays continuous across harnesses.

**Updating.** An installed plugin is a versioned snapshot, same as Claude Code and
Codex - bumping the version in `opencode.json` (or letting Bun resolve a new
range) is what picks up a release, not a `git pull`. The running version is
printed in the injected session-start block (`## throughline vX.Y.Z`) the same way
it is on Claude Code and Codex - if it lags this repo's releases, your install is
stale.

Publishing to npm is tag-triggered: pushing a `vX.Y.Z` tag runs a GitHub Actions
workflow that publishes `@dynamicagency/throughline-opencode` via npm Trusted
Publishing (OIDC), with no long-lived npm token and an automatic provenance
attestation on the published package.

**Local-path install (testing unreleased changes).** Point `opencode.json` at a
checkout of this repo instead of the package name:

```json
{
  "plugin": ["/absolute/path/to/throughline/.opencode-plugin"]
}
```

The package's `main` field points at compiled `dist/`, which is gitignored, so a
local-path install needs a build first: `cd .opencode-plugin && npm ci && npm run
build`. Unlike the npm install, this stays a live checkout - `git pull` and
rebuild to update it.

### npx skills

```sh
npx skills add dynamic/throughline
```

Installs the 4 skills directly - no plugin system, no marketplace registration. This
is the fallback for any harness that reads `SKILL.md` files from disk but has no
plugin system of its own. **What you get:** the 4 skills, nothing else - no
automatic capture (there's no hook mechanism in this delivery form at all); run
`handoff` manually at the end of a session.

## Configuration

By default, state lives in **`.claude/throughline/`** in each project (the universal
Claude Code workspace dir). Override the location with an environment variable:

```sh
# Opt in to a portable .agent/ handoff convention - e.g. for cross-harness use,
# or a team that has agreed to commit its handoffs (see "Local by default" below):
export THROUGHLINE_DATA_DIR=.agent/handoff
```

- Relative values resolve against the project root; absolute values are used as-is.
- throughline auto-activates in every project: the first time any hook fires it
  creates its data dir on demand, so capture starts working immediately with no
  manual opt-in. To keep it out of a specific project, drop an empty
  `.throughlineignore` file at the project root (see "Opting a project out" below).

### Git worktrees

In a **linked git worktree** (e.g. Claude Code's `claude/<branch>` auto-worktree
workflow, under `<project>/.claude/worktrees/<name>/`), "the project root" above
resolves to the **main working tree**, not the worktree itself - so every worktree
of a repo, plus its main checkout, share one `HANDOFF.md`/`logs/`/`buffer/` instead
of each worktree silently accumulating its own. The session-start capture point
prints a note when this redirect is active. Live git state (current branch,
`git status`) and captured file paths still describe the worktree you're actually in.

Set `THROUGHLINE_WORKTREE_SHARED=0` to opt back into isolated per-worktree data
dirs. Requires git 2.31+; falls back to per-worktree behavior for bare repos,
submodules, and older git.

### Opting a project out

throughline activates automatically in every project. To disable it for one
project, add an empty marker file at the project root:

```sh
touch .throughlineignore
```

**In a linked git worktree** (see "Git worktrees" above), place this at the
**main** working tree's root, not the worktree you're sitting in - that's where
the opt-out check now looks by default. (A marker already sitting in a worktree
from before worktree-sharing existed is still honored there too, so upgrading
never silently re-enables a pre-existing opt-out.)

With that file present, no new data dir is created, and `onboard`/`capture` stop
adding anything new - regardless of `THROUGHLINE_DATA_DIR` or any pre-existing
`.claude/throughline/`. The opt-out wins even over a project that was already
active: existing `HANDOFF.md`/`logs/` are left in place, and no *new* activity is
recorded. One nuance: if a session was already being captured when the file
appears, `flush`/`precompact` still finalize that one session's already-existing
buffer (its end-stamp or compaction marker) rather than leaving it in a permanent
"still live?" limbo - they don't create anything new, they just avoid corrupting
bookkeeping for work that had already legitimately started. Remove the file to
re-enable. Commit it like `.gitignore` so the policy is shared with teammates.

### Disabling machine-wide

To turn throughline off everywhere without uninstalling or touching every project,
set the kill switch (e.g. in `~/.claude/settings.json`'s `env` block, or your shell
profile):

```sh
export THROUGHLINE_DISABLE=1
```

Any value other than `0` disables **all five hooks completely** - no capture, no
SessionStart block (not even about existing data), no end-stamps. This is stricter
than `.throughlineignore`, which keeps orienting toward already-existing content.
Unset it (or set `0`) to re-enable; existing data is untouched either way.

**Cross-harness handoffs.** The data dir is the one knob that makes throughline
portable. Point it at `.agent/handoff` (or any other path) and the durable
`HANDOFF.md` it produces lives in a harness-neutral location any agent can read,
not buried under a Claude-Code-specific path - useful if other tooling also drives
this project. Portability of the *location* is independent of whether you commit
it - see "Local by default" below.

### Local by default

throughline's data - `HANDOFF.md`, `logs/`, `buffer/`, everything under the data
dir - is **per-operator working memory, not a shared team artifact**, and stays
local (gitignored) by default. Gitignore the whole data dir for whichever location
you use:

```gitignore
# default layout
.claude/throughline/
# or, if you set THROUGHLINE_DATA_DIR=.agent/handoff
.agent/handoff/
```

**Team projects.** On a project with multiple developers - especially ones not
using throughline, or already running their own memory/notes tooling - committing
one operator's session artifacts into the shared tree causes real friction: churn
and merge conflicts on the single mutable `HANDOFF.md`, review noise on every PR,
and possible collision with whatever a teammate already relies on. Local-only
avoids all of it: nothing throughline writes reaches a teammate's checkout unless
you deliberately choose to share it.

**Opting in to tracking.** For a solo repo, or a team that has all adopted
throughline, committing `HANDOFF.md` + `logs/` gives fresh clones and teammates a
shared, readable project record - genuinely useful when everyone is actually
reading it. To opt in, un-ignore just those two paths (keep `buffer/` and
`.capture-errors` ignored always - `buffer/` is scratch and can contain unredacted
command text, and `.capture-errors` is a scratch breadcrumb file):

```gitignore
.claude/throughline/*
!.claude/throughline/HANDOFF.md
!.claude/throughline/logs/
```

The `handoff` skill's Phase 4 offers (never auto-runs, and relevant
only once you've opted in as above) to stage exactly `HANDOFF.md` + the new
session log and commit/push them - it checks `git check-ignore` first and skips
the offer entirely when the files aren't actually committable in your layout.

> **Heads-up for allowlist-style `.gitignore`.** If your repo ignores everything
> by default (a root `/*` then `!/keep` pattern) and you *do* want to opt in to
> tracking, re-including just the two leaf paths does **not** work - git prunes
> an excluded directory before it ever evaluates negation patterns for paths
> inside it, so `.claude` (matched by the root `/*`) is never even descended
> into. The simplest fix is `THROUGHLINE_DATA_DIR=.agent/handoff` so the
> opted-in artifacts sit outside the ignored tree entirely. To keep the default
> location instead, negate **every ancestor directory** on the way down, then
> re-exclude the scratch paths (which the ancestor negations would otherwise
> expose too):
> ```gitignore
> !/.claude/
> !/.claude/throughline/
> !/.claude/throughline/HANDOFF.md
> !/.claude/throughline/logs/
> .claude/throughline/buffer/
> .claude/throughline/.capture-errors
> ```

## Housekeeping

Everything throughline writes grows without automatic bound: there is no
background cleanup process, deliberately, to keep the plugin's footprint at
"pure POSIX sh + jq, zero infrastructure." What's safe to clean up by hand,
and what isn't:

**Safe to delete:**
- `buffer/archive/*.md` older than your last `consolidate` pass -
  once a consolidation has mined a log for recurring lessons, an archived raw
  buffer behind it has nothing left to give. As a simple rule of thumb, an
  archived buffer older than ~90 days with no open question against it is safe
  to remove.
- `.capture-errors`, once its contents have been surfaced in a session log and
  cleared by the handoff skill (Phase 4): it's a breadcrumb meant to be read
  once, not a running log.

**Not safe to delete:**
- `logs/`: these are the evidence trail. `consolidate` explicitly
  never prunes them, and HANDOFF.md's own "Recent Session Logs" list only ever
  points at the last 5, so older logs are already off the beaten path without
  needing to be deleted.
- `HANDOFF.md` itself, obviously - it's the durable record.
- Any buffer still in `buffer/` (not yet archived) - it may be an in-progress or
  unconsumed session; run a handoff first, which moves it to `archive/` once
  distilled.

There's no automated retention policy beyond this: clean up by hand on the
cadence above, or leave it, a growing `archive/` costs disk, not correctness.

## Auto-handoff at wrap-up (optional reinforcement)

The handoff skill is written to run proactively when the agent detects the session
winding down. To reinforce it, add one line to your project or global `CLAUDE.md`:

> When a session reaches a natural stopping point or the user signals they're done,
> run the `handoff` skill and report the diff - don't wait to be asked.

## Layout

```
throughline/
├─ .claude-plugin/
│  ├─ plugin.json
│  └─ marketplace.json
├─ .codex-plugin/
│  └─ plugin.json           # declares skills; hooks found via convention in hooks/
├─ .agents/plugins/
│  └─ marketplace.json      # Codex marketplace entry, mirrors .claude-plugin's
├─ .opencode-plugin/
│  ├─ package.json          # Node dependencies + plugin entry point (main)
│  ├─ tsconfig.json         # TypeScript config
│  ├─ .gitignore            # Excludes node_modules/ and dist/
│  └─ src/
│     ├─ index.ts           # Plugin entry point
│     ├─ lib.ts             # Core library (data dir, session ID, buffer)
│     ├─ hooks/             # All 5 hook implementations
│     │  ├─ session-created.ts
│     │  ├─ chat-message.ts
│     │  ├─ tool-execute-after.ts
│     │  ├─ session-compacted.ts
│     │  └─ session-idle.ts
│     ├─ utils/
│     │  ├─ redaction.ts       # Redaction logic ported from jq to TypeScript
│     │  └─ redaction.test.ts
│     └─ integration.test.ts
├─ hooks/
│  ├─ hooks.json
│  ├─ _lib.sh                # data-dir resolution + activation gate + jq/sid/redaction helpers
│  ├─ session-onboard.sh     # SessionStart: pointer, git state, compaction recovery
│  ├─ session-prompt.sh      # UserPromptSubmit: redacted, truncated user-intent line
│  ├─ session-capture.sh     # PostToolUse: structured action buffer (outcome + redaction)
│  ├─ session-precompact.sh  # PreCompact: stamp the compaction-boundary marker
│  └─ session-flush.sh       # SessionEnd: safety-net stamp
├─ skills/
│  ├─ onboard/SKILL.md            # full orientation
│  ├─ handoff/SKILL.md            # judged distillation + memory binding
│  ├─ consolidate/SKILL.md        # periodic promotion of recurring lessons
│  └─ consolidate-memory/SKILL.md # native-memory file hygiene
├─ tests/run.sh              # fixture-driven hook tests (shellcheck + CI)
├─ docs/                     # promo site + review report
└─ CHANGELOG.md
```

## Support

throughline is free, MIT-licensed, and has no telemetry or infrastructure to fund. If
it saves you a session's worth of context, consider
[sponsoring the work](https://github.com/sponsors/dynamic).

## License

MIT © Dynamic Agency
