# herdr-opencode

[![npm](https://img.shields.io/npm/v/@phux/herdr-opencode)](https://www.npmjs.com/package/@phux/herdr-opencode)

Native [Herdr](https://herdr.dev) lifecycle reporting for
[OpenCode](https://opencode.ai) **v1 and v2** from one plugin.

Inside a Herdr pane, OpenCode's actual state (working / blocked / idle) and
session identity are reported straight to the Herdr daemon over its socket —
no screen scraping, no heuristic manifest matching. Herdr's agent panel shows
the real state, and panes restore with `opencode --session <id>` after a
server restart.

```
┌─ herdr ──────────────────────────────────────┐
│ pane: opencode        state: working ▮▮▮     │
│ pane: claude          state: blocked ⏸       │
└──────────────────────────────────────────────┘
        ▲ pane.report_agent / pane.report_agent_session
        │
   opencode v1 or v2, running this plugin
```

## Why this exists

Herdr ships an OpenCode integration (`herdr integration install opencode`),
but as of herdr 0.8.0 it has two problems this plugin fixes:

1. **It does not load on modern OpenCode.** The stock plugin uses a named
   export; OpenCode 1.18+ only invokes `export default`
   ([herdr#2548](https://github.com/herdrdev/herdr/issues/2548)).
2. **It never reports state even when hand-patched**, because root sessions
   were misclassified as child sessions and swallowed
   ([herdr#2548](https://github.com/herdrdev/herdr/issues/2548), defect 2).
3. **OpenCode 2 (`opencode2`) is not recognized at all** — herdr's process
   detector looks for the `opencode` executable
   ([discussion #1971](https://github.com/herdrdev/herdr/discussions/1971)).

This plugin speaks the same socket protocol, loads correctly on OpenCode
≥ 1.18.29 (v1) **and** on OpenCode 2 (`opencode2`), fixes the root/child
classification, and adds nothing else — no dependencies, no hooks into your
prompts.

## Install

### OpenCode v1

```sh
npm install -g @phux/herdr-opencode
```

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["@phux/herdr-opencode"]
}
```

### OpenCode 2 (`opencode2`)

```sh
npm install -g @phux/herdr-opencode
```

```jsonc
// ~/.config/opencode/opencode.json — v2 reads the same file family
{
  "plugins": ["@phux/herdr-opencode"]
}
```

Both hosts load the same entrypoint: v1 calls `server()`, v2 calls `setup()`
(the dual shape from [OpenCode's plugin docs](https://opencode.ai/v2/docs/build/plugins)).

### Local file (no npm)

```sh
curl -fsSL https://raw.githubusercontent.com/no-phux/herdr-opencode/main/src/index.ts \
  -o ~/.config/opencode/plugins/herdr-opencode.ts
```

v1 discovers `plugins/*.ts` directly; v2 discovers direct files too
(child *directories* as packages need a reasonably current v2 build —
[anomalyco/opencode#41530](https://github.com/anomalyco/opencode/issues/41530)).

## What it reports

| OpenCode event | Herdr |
| --- | --- |
| `session.created` (root) | `pane.report_agent_session` with `session_start_source: new` |
| `session.updated` (changed root) | `pane.report_agent_session` |
| `session.status` → busy/running/streaming/… | state `working` |
| `session.status` → idle | state `idle` |
| `session.status` (unknown kind) | bare session re-report |
| `tool.execute.*`, `permission.replied`, `session.compacted` | state `working` |
| `permission.asked`, `question.asked`, `session.error` | state `blocked` |
| subagent/child sessions | dropped — child prompts project state without stealing the pane's root session |

The wire protocol is Herdr's own: line-delimited JSON over
`HERDR_SOCKET_PATH` (`\\.\pipe\` on Windows), methods `pane.report_agent` and
`pane.report_agent_session`, stamped with `pane_id`, `source: herdr:opencode`,
`agent: opencode`, and a monotonic `seq`. One short-lived connection per
report with a 500 ms timeout — a wedged daemon can never hang your session.

## Notes for OpenCode 2 users

- OpenCode 2 installs as `opencode2`; Herdr's process detector currently
  keys on the `opencode` executable name. Until Herdr ships native v2
  detection ([discussion #1971](https://github.com/herdrdev/herdr/discussions/1971)),
  launch v2 through an alias so the pane is recognized:

  ```sh
  target="$(readlink -f "$(command -v opencode2)")"
  mkdir -p ~/.local/opt/opencode2-herdr
  ln -sfn "$target" ~/.local/opt/opencode2-herdr/opencode
  # launch ~/.local/opt/opencode2-herdr/opencode
  ```

- This plugin reports `agent: opencode` either way — that is the agent type
  Herdr's manifest already understands, and the v2 progress bar maps to
  `working` under Herdr's screen fallback while the pane is undetected.

## Debugging

```sh
HERDR_OPENCODE_DEBUG=1 opencode   # reports to stderr as [herdr-opencode]
herdr agent list                  # agent_session should now be populated
```

If state never updates: check `HERDR_ENV`, `HERDR_SOCKET_PATH`, and
`HERDR_PANE_ID` are set in the pane (they are injected by Herdr itself), and
that the plugin is listed as loaded (`/plugins` in v2, or opencode's startup
logs in v1).

## Compared to `herdr integration install opencode`

| | stock integration | herdr-opencode |
| --- | --- | --- |
| OpenCode v1 ≥ 1.18.29 | ✗ (never loads) | ✓ |
| OpenCode v1 older | ✓ (named export) | ✓ |
| OpenCode v2 (`opencode2`) | ✗ | ✓ |
| root/child classification | ✗ (swallows all events) | ✓ fixed |
| session restore | ✗ (no session reported) | ✓ |
| dependencies | none | none |

Keep the stock integration uninstalled while using this one — two reporters
would interleave conflicting `seq` streams on the same pane.

## Development

```sh
npm ci
npm test        # typecheck + build + node:test (classifier + real socket round-trip)
```

The classifier and wire protocol are pure and table-tested; the socket test
stands up a real Unix socket server and asserts the exact JSON lines and
their ordering.

## License

MIT — built by the [phux](https://github.com/no-phux/phux) contributors for
the Herdr community.
