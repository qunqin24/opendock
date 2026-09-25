# opencode-forge

Single general-purpose **forge** agent + a plan harness for
[opencode](https://opencode.ai) ≥ 1.18. Plans become first-class files on
disk with tool-enforced structure, a hard write-ban while planning, user
confirmation gates for approve/close, and tick-as-you-go task tracking.

```
/plan fix login timeout   → read-only recon → plan_write (draft, writes denied)
                           → present → plan_approve (user dialog = approval gate)
                           → execute task by task, plan_tick on each (timestamped audit)
                           → all ticked → per-criterion self-check → plan_close
                             (user dialog = completion gate) → done
/plan                     → list in-progress plans with progress
/plan resume              → continue the most recent unfinished plan
/plan discard             → abandon the current plan (abandoned, writes restored)
```

- Plan files: `.opencode/plan/<date>-<slug>.md` in your project, frontmatter
  state machine `draft → approved → done` (exit: `abandoned`).
- While a plan is in draft, `write` / `edit` / `bash` / `task` are **denied
  at the permission layer** — including your own `allow` config. The only
  exits are approval and discard. This is deliberate; see Design stance.
- `plan_approve` / `plan_close` are pinned to a confirmation dialog: the
  model can never flip the state itself.
- The native `build` / `plan` agents are hidden while the plugin is loaded
  (runtime injection, nothing written to your config). Uninstall restores
  them automatically; plan files are never deleted.

## Install

Requires opencode ≥ 1.18.

```bash
# npm (recommended)
opencode plugin @sorenllm/opencode-forge --global
# or GitHub source
opencode plugin github:ChengZiiii/opencode-forge --global
```

Local development: add `"file:///<repo abs path>"` to the `plugin` array in
your opencode config. Single-file install: copy `dist/index.js` to
`~/.config/opencode/plugin/forge.js` **and manually copy `SKILL.md`** to
`~/.config/opencode/skills/plan/SKILL.md` (the package has no installer
script; that mode has no bundled skill otherwise).

Note: do not enable opencode's experimental plan mode
(`OPENCODE_EXPERIMENTAL_PLAN_MODE`) together with forge — two plan mechanisms
would overlap.

## Configuration

Everything works with zero config. Optional knobs (your config, your files —
the plugin never writes them):

```jsonc
{
  "agent": {
    "forge": {
      "model": "provider/model",   // pick any model for forge
      "disable": true              // one-knob return to native: no forge,
                                   // build/plan restored, no tools/commands/skill
    }
  }
}
```

If you already have a `command.plan` of your own, it wins and the plugin's
`/plan` is not registered.

## Uninstall (four steps, restores native opencode)

1. Remove the plugin entry from the `plugin` array in
   `~/.config/opencode/opencode.json` (global installs).
2. Delete the package store dir:
   `~/.cache/opencode/packages/@sorenllm/opencode-forge/` (npm installs,
   scope-dir layout; for github installs it is
   `~/.cache/opencode/packages/github_ChengZiiii/opencode-forge/`).
3. Delete the `agent["forge"]` block from your config if you added one
   (otherwise the name lingers in the agent list).
4. Done — the hidden native `build`/`plan` agents come back automatically
   (the hide was runtime-only). Your `.opencode/plan/` files are yours;
   delete them yourself if you want.

## File ledger

What this plugin touches, exhaustively:

| Where | What | Lifetime |
| --- | --- | --- |
| `<project>/.opencode/plan/*.md` | plan files | user data — kept forever, uninstall never deletes |
| merged config object (RAM only) | forge agent, native build/plan `disable`, `skills.paths` entry, `command.plan` | vanishes when the plugin is removed; nothing is written to disk |
| `~/.cache/opencode/packages/...` | installed package copy | written by the `opencode plugin` installer, not the plugin |
| `~/.config/opencode/opencode.json` | `plugin` array entry | written by the installer |

The plugin writes no temp files, no logs, nothing outside the table.

## Design stance (read before filing "bash is blocked" issues)

During a plan's draft phase every mutating tool — `bash` included — is
denied, and an `allow` in your config does not override it. Reconnaissance is
read/grep/glob; if you genuinely need a shell command to decide the plan,
approve the plan first (revising after approval is allowed via a new `/plan`).
The escape hatches are `plan_approve` and `/plan discard`, by design.

A process restart forgets the session binding: the write-ban soft-disables
(safety over strictness) and the next session's system notice + `/plan
resume` re-bind from the plan file on disk, which is the source of truth.

## Development

```bash
npm install
bun run typecheck     # tsc --noEmit
node --test tests/*.test.mjs
bun run bundle        # rebuild self-contained dist/index.js (committed)
```

Architecture: `plugin.ts` (dual entry — v1 `server` full-featured + v2
`setup` defensive forward-compat) + `src/plan-file.ts` (pure plan document
core, unit-tested, no opencode imports) + `SKILL.md` (planning discipline,
discovered via `config.skills.paths`). Behavioral changes go through the
OpenSpec workflow in `openspec/` — see AGENTS.md. Common pitfalls live in
`../opencode-plugin-dev-pitfalls.md`.

## License

MIT
