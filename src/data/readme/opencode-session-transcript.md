# opencode-session-transcript

Fixes `/export`'s truncation bug. Writes Markdown for reading, not JSON for
re-import — it complements `/export` rather than replacing it.

> **This is a stopgap** for bugs in `/export`
> ([#50732](https://github.com/anomalyco/opencode/issues/50732),
> [#50014](https://github.com/anomalyco/opencode/issues/50014)) that are being
> fixed upstream. Once those land, this should be retired in favour of a
> correct `/export`.

> **Not a backup.** `/export` writes JSON, which `opencode import` can read
> back. This writes Markdown, which cannot be re-imported, and it drops
> assistant reasoning to do it. If you want a restorable archive, keep using
> `/export`.

## The problem

OpenCode can export a session, but `/export` has three separate shortcomings:

**It silently truncates.** [#50732](https://github.com/anomalyco/opencode/issues/50732)
and [#50014](https://github.com/anomalyco/opencode/issues/50014) both report
that `/export` writes only the messages currently loaded in the TUI, not the
full transcript. In a long session, early prompts and responses are simply
absent — and nothing warns you, so the file looks complete. This is the worst
possible failure mode for an export tool, because you only find out when you go
looking for something that isn't there.

**It means different things in different clients.**
[#48105](https://github.com/anomalyco/opencode/issues/48105) documents that
`/export` in the TUI produces human-readable Markdown while `opencode export`
on the CLI produces JSON for re-import. The desktop app's `/export` follows the
JSON behaviour, so there is no Markdown export there at all.

**There is no CLI equivalent that reads well.** `opencode session export` gives
you a multi-megabyte JSON file — correct and complete, but not something you
would ever read end to end.

## What this does

One command. It reads every message for the current session straight out of
OpenCode's SQLite store and writes them to a Markdown file you can actually
read.

```
/save
```

```
/home/steven/Documents/archiving-older-ai-conversations.md

835 messages · 234 KB
```

The output is the same conversation you'd expect to read, with tool calls kept
inline and assistant reasoning dropped:

```markdown
# Archiving older AI conversations

**Started:** 2026-10-13 11:43
**Directory:** `/home/steven/Documents/Default Project`
**Session id:** `ses_ec96bff81ffdMzlHLBZmD0r2Nj`

### You · 11:43
can I archive older AI conversations to free up session space...

### Assistant · 11:43
I'll check the OpenCode docs on sessions and CLI settings.

**[tool]** `webfetch` — completed
```

Because it reads the database rather than the UI's loaded window, the output is
complete regardless of how much of the thread you have scrolled.

## Install

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-transcript"]
}
```

Or point at a local checkout:

```jsonc
{ "plugins": ["/absolute/path/to/opencode-session-transcript"] }
```

No dependencies are installed at runtime. The plugin uses whichever SQLite
driver the host provides (`bun:sqlite` under Bun, `node:sqlite` under Node 22+).

## Usage

| Command | Effect |
| --- | --- |
| `/save` | Write the current session to `~/Documents/<session title>.md` |
| `/save ~/Desktop/today.md` | Write wherever you say |
| `/unarchive` | List archived sessions |
| `/unarchive <n \| id \| title>` | Restore one |

Set `OPENCODE_TRANSCRIPT_DIR` to change the default folder.

Filenames come from the session's own title, read at run time. Two sessions
sharing a title will overwrite each other — pass an explicit path to keep both.

### About `/unarchive`

This plugin started as a session-archiving tool. `/archive` and `/unarchive`
were built to declutter the session list, then dropped when the project view —
the 4-squares toggle in the top-left of the desktop app — turned out to cover
that already. What remained was wanting a session *out* as readable text, which
is what `/save` does.

Restoring stayed because it is the one half with no equivalent in the UI:
OpenCode can archive a session but offers no way to undo it.

**Planned deprecation:** `/unarchive` will be removed in a future major
version. Restoring an archived session belongs in OpenCode core, not in a
stopgap for `/export`, and keeping it here muddies what this package is for.
Expect it to move to a separate plugin rather than disappear.

There is deliberately no matching `/archive`. Archiving hides a session without
removing it, and the project view already makes everything findable again, so
on offer it solves nothing.

An ambiguous term restores nothing rather than guessing: a title fragment that
matches two sessions will ask you to be more specific rather than pick one.

## Safety

- `/save` is **read-only**. It only reads `session_v2` and `session_message` and
  writes one Markdown file of its own.
- `/unarchive` **does** write, and takes a `VACUUM INTO` snapshot first, which is
  consistent while OpenCode holds the database open in WAL mode. It only ever
  sets `time_archived` and `time_updated` — never a message. It also keeps the
  three most recent snapshots and prunes older ones.
- Schema-agnostic: discovers `session_v2` (v2.x) or `session` (v1.x) and
  introspects its columns rather than hardcoding either.

## Development

```bash
npm test          # node --test, no install required
npm run check     # confirms both modules load
npm run typecheck # requires typescript
```

The test suite builds throwaway databases in **both** schemas and runs the
shared suite against each, so v1 and v2 support is exercised rather than
assumed.

## Upstream

Once `/export` is correct — desktop parity plus the truncation fix — this
plugin should be retired. The goal is for `/export` to work properly, not for
this to become infrastructure anyone depends on.

## Licence

MIT