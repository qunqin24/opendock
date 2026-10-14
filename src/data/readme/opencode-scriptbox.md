# opencode-scriptbox

A closed-world registry of reusable agent utility scripts for OpenCode.
Scripts run via shell — this plugin exposes them, never executes.

> Built on the OpenCode 2.x plugin API only. No 1.x support.

Every session rediscovers the same helpers — the PNG diff, the log census,
the report shaper — and each time they come back slightly different,
living in `/tmp` or inlined into a heredoc that vanishes with the turn.
Past sessions evaporate, so agents reinvent instead of reuse. Scriptbox
gives those helpers one canonical home: a user-level directory where each
script carries a header contract, gets indexed on every read, and shows up
on demand as a single purpose line. Nothing enters context by merely being
on disk — only scripts with a valid name and header are visible, and
everything else in the directory stays private by default.

Filenames are lowercase alphanumeric-and-hyphens with a `.py` or `.sh`
suffix, descriptive enough to read (`png-compare.py`, never `tmp-1.py`).
The leading header carries a `purpose:` one-liner of at most 140 characters
plus an optional `usage:` line:

```python
"""purpose: Compare baseline vs verify screenshots, print bbox diff.
usage: python3 png-compare.py BASE VERIFY [--json]
reads: two PNG files. writes: stdout only.
"""
```

Shell scripts say the same with `# purpose:` and `# usage:` comment
lines. Anything without a valid name or header is ignored by the indexer,
silently and completely.

Three tools in the `scriptbox` namespace work the registry. `save` takes a
filename and content, validates both against the contract, and stores the
script in one step — rejection happens before anything touches disk.
`list` returns the compact catalog of name plus purpose from a live disk
scan, which is the check to run before reaching for an ad-hoc heredoc.
`show` gives back usage, path, and last-used for one script. Alongside
them, a `tool.execute.before` hook watches shell invocations that reference
registry scripts and bumps their `lastUsed`, quietly feeding future
pruning. It never blocks or alters a call.

```json
{ "package": "opencode-scriptbox@0.1.0", "options": {} }
```

Two options exist: `{ "dir": "/custom/registry/dir" }` (the default home
is `~/.config/opencode/scripts`) and `{ "metrics": true }`, which keeps
session-aggregated counters — save, list and show calls, per-script uses
and shell matches — in the registry's `usage.json`, capped at twenty
sessions with cumulative totals. Only counts, never commands or contents,
and it defaults to off.

## Development

```bash
npm install --no-audit --no-fund
npm test
npm run typecheck
```

## License

MIT.
