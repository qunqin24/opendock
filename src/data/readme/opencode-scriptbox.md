# opencode-scriptbox

Closed-world registry of reusable agent utility scripts for OpenCode.

Agents keep reinventing the same helpers as shell heredocs because past
sessions evaporate. Scriptbox gives those helpers one canonical home:
a user-level directory where scripts live under a header contract, get
indexed, and show up on demand with a one-line purpose each. Scripts
run via shell — this plugin exposes, never executes.

Requires OpenCode 2 (V2 plugin API only, no 1.x support).

## Why

- **No more tmp.** Reusable computation (PNG diffs, log census, report
  shaping) stops living in `/tmp` or inline fallbacks.
- **Exposed, not guessed.** The agent lists name + purpose lines instead
  of re-deriving helpers from memory.
- **Closed world.** Only indexed scripts are visible. Pre-existing
  private utilities without a valid header stay invisible — nothing
  enters context by merely being on disk.

## Install

```json
{ "package": "opencode-scriptbox@0.1.0", "options": {} }
```

Options: `{ "dir": "/custom/registry/dir" }`. Default registry dir is
`~/.config/opencode/scripts`.

## Header contract

File name: lowercase alphanumeric/hyphens, `.py` or `.sh`, descriptive
(`png-compare.py`, never `tmp-1.py`). Leading header must carry a
`purpose:` one-liner (max 140 chars) plus optional `usage:`:

```python
"""purpose: Compare baseline vs verify screenshots, print bbox diff.
usage: python3 png-compare.py BASE VERIFY [--json]
reads: two PNG files. writes: stdout only.
"""
```

Shell equivalent with `# purpose:` / `# usage:` comment lines. Files
without a valid name/header are ignored by the indexer.

## Tools (`scriptbox` namespace)

- `save {filename, content}` — validate and store a script in one
  step. Rejects bad names/headers before touching disk.
- `list` — compact catalog (name + purpose) from a live disk scan.
  Check here before ad-hoc heredocs.
- `show {name}` — usage, path, last-used of one script.

A `tool.execute.before` hook observes shell invocations referencing
registry scripts and bumps their `lastUsed`, feeding pruning. It never
blocks or alters calls.

## Development

```bash
npm install --no-audit --no-fund
npm test
npm run typecheck
```

## License

MIT.
