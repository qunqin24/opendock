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
| **Session start** | Injects a HANDOFF.md pointer + live git state into context, and warns if the handoff looks stale against the branch's latest commit. Mechanical and cheap. |
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
| Session end | `SessionEnd` hook | `session.idle` event (fires after every turn, not once at exit - see [docs/INSTALL.md#opencode](docs/INSTALL.md#opencode)) |

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

## Try it

`demo/` is a small fictional project with a real, populated
`.claude/throughline/` already in it - a HANDOFF.md, a prior session log, and
a live capture buffer that never got distilled - so you can see the artifacts
before generating your own:

```sh
git clone https://github.com/dynamic/throughline && cd throughline
./demo/setup.sh && cd demo/homelab
claude --setting-sources project,local --strict-mcp-config \
       --tools Read,Glob,Grep,Bash,Skill,Write
```

Ask `where were we?` and the answer comes from `HANDOFF.md`, injected by the
`SessionStart` hook before your first message. `./demo/setup.sh` prints the
rest of the walkthrough.

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

Then reload (`/reload-plugins`) or restart the session. Requires `git` and `jq` on
your `PATH`.

### Codex CLI

```sh
codex plugin marketplace add dynamic/throughline
codex plugin add throughline@throughline
```

Same requirements as Claude Code. Codex gates hooks behind a one-time per-machine
trust dialog on first use - see [docs/INSTALL.md](docs/INSTALL.md#codex-cli).

### OpenCode

```json
{
  "plugin": ["@dynamicagency/throughline-opencode"]
}
```

Add to `opencode.json` and restart; Bun installs it automatically. Requires
Node.js 18+, no `jq`. Hooks only - see
[docs/INSTALL.md](docs/INSTALL.md#opencode) for skills and the local-path install.

### npx skills

```sh
npx skills add dynamic/throughline
```

Skills only, no automatic capture - the fallback for any harness with no plugin
system of its own.

Full per-harness detail - requirements, what each install gives you, updating,
Codex's trust step, OpenCode's local-path install - lives in
[docs/INSTALL.md](docs/INSTALL.md).

## Configuration

State lives in **`.claude/throughline/`** in each project by default, local
(gitignored) and per-operator - not a shared team artifact unless you opt in.
throughline auto-activates on first use; drop an empty `.throughlineignore` at
the project root to opt a project out, or set `THROUGHLINE_DISABLE=1` to kill it
machine-wide. It shares one data dir across a repo's git worktrees.

Git worktrees, the opt-out marker, the kill switch, committing `HANDOFF.md` to
a team repo (and the trust boundary that implies), and cleanup guidance are all
in [docs/REFERENCE.md](docs/REFERENCE.md).

## Auto-handoff at wrap-up (optional reinforcement)

The handoff skill is written to run proactively when the agent detects the session
winding down. To reinforce it, add one line to your project or global `CLAUDE.md`:

> When a session reaches a natural stopping point or the user signals they're done,
> run the `handoff` skill and report the diff - don't wait to be asked.

## Related

Session-memory tools for Claude Code are a crowded field. What's out there, and how
throughline differs, one line each:

- **[adrrr/persistent-handoff](https://github.com/adrrr/persistent-handoff)** - one
  mutable file, rewritten in place at milestones, deleted when nothing is in flight.
  Built for a long-running daemon agent (tmux + cron restarts) that needs one state
  file, not for a repo you return to over weeks and want a readable history of.
- **[thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)** - AI-compressed
  observations in SQLite/FTS5 plus vector search, progressive-disclosure retrieval.
  Its retrieval ideas are sound; the runtime (a background worker process) is the
  infrastructure weight throughline stays "pure POSIX sh + jq" to avoid.
- **[thepushkarp/handoff](https://github.com/thepushkarp/handoff)** - auto-injects the
  latest handoff entry on `SessionStart(compact)`; a `Stop` hook blocks session exit
  until the model fills in required summary fields. throughline captures continuously
  instead of gating exit, so nothing is lost if a session ends without a summary.
- **[REMvisual/claude-handoff](https://github.com/REMvisual/claude-handoff)** -
  sequence-numbered chain links between handoffs, "What We Tried" as the highest-value
  section, self-validation gates. Closest in spirit to throughline's emphasis on
  concrete failed approaches over narrative summary.
- **[who96/claude-code-context-handoff](https://github.com/who96/claude-code-context-handoff)**
  - restores context as `additionalContext` on `SessionStart(compact|clear)`, with an
  age-guarded fallback to the latest handoff. No automatic capture between writes.
- **[Sting25/claude-code-handoff](https://github.com/Sting25/claude-code-handoff)** -
  auto-snapshots git state and model decisions at context boundaries. One file per
  repo, agent-written at the boundary rather than captured continuously.
- **[blader/baton](https://github.com/blader/baton)** - pass in-progress work to the
  next agent via a single verified markdown file, manual on both ends, works with
  Codex as well as Claude Code.
- **[rupaut98/unforget](https://github.com/rupaut98/unforget)** - a local,
  zero-dependency `SessionStart` hook that re-injects working state lost to
  compaction, extracted from the transcript rather than written by the agent.
- **[mattpocock/skills](https://github.com/mattpocock/skills)** (`handoff` skill) -
  writes once to the OS temp directory on manual invocation. Disposable, and the
  right tool for a coding session you'll close today rather than resume tomorrow.

Where throughline differs from all of the above: capture is mechanical and continuous
(five hooks, no model call, independent of whether the agent remembers to write
anything), and it's the only one of these that also redacts secrets at capture time.

## Support

throughline is free, MIT-licensed, and has no telemetry or infrastructure to fund. If
it saves you a session's worth of context, consider
[sponsoring the work](https://github.com/sponsors/dynamic).

## License

MIT © Dynamic Agency
