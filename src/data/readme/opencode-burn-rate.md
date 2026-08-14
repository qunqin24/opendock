# opencode-burn-rate

[![npm version](https://img.shields.io/npm/v/opencode-burn-rate.svg)](https://www.npmjs.com/package/opencode-burn-rate) [![MIT license](https://img.shields.io/npm/l/opencode-burn-rate.svg)](https://opensource.org/licenses/MIT)

opencode TUI plugin that adds a "Burn Rate" item to the TUI sidebar showing two projected hourly USD rates (session-lifetime average and active-work rate) for the current session, including all subagent (child) sessions. The session's own cost updates immediately; subagent costs and activity data are polled every 60 seconds.

## Installation

### Recommended: opencode CLI

```sh
opencode plugin -g opencode-burn-rate
```

`opencode plug -g opencode-burn-rate` is an alias. The `-g` flag (or `--global`) installs at global scope; omit it to install locally instead. Because the package exports `./tui`, the command also writes the entry into `tui.json` automatically.

### From the TUI

Press Ctrl+P to open the command palette, run "Install plugin", enter `opencode-burn-rate`, and press Enter. Press Tab to toggle between local and global scope.

### Manual

Add `opencode-burn-rate` to the `plugin` array in `~/.config/opencode/tui.json`, or a project-level `tui.json`:

```json
{
  "plugin": ["opencode-burn-rate"]
}
```

Restart opencode after installing with any method.

This is a TUI plugin: adding it to the `plugin` array in `opencode.json` will not load it. `tui.json` is the TUI-side config.

### AI-assisted install

Give any coding agent this block:

```text
Install the opencode-burn-rate TUI plugin by running `opencode plugin -g opencode-burn-rate`; if that command is unavailable, add "opencode-burn-rate" to the "plugin" array in ~/.config/opencode/tui.json (create the file if missing), then tell me to restart opencode. Note it must go in tui.json, not opencode.json.
```

## How the rate is computed

The plugin computes two projected hourly USD rates from the total cost of the session and all subagent (child) sessions. The session's own cost updates immediately; subagent costs and activity data are polled every 60 seconds. Both rates floor elapsed time at 1 minute so sessions younger than one minute do not show absurd extrapolations.

**Session avg** — a running session-lifetime average:

`(total USD cost) / elapsed * 3_600_000`

The elapsed window runs from session creation to the last time the total cost was observed to change across the session and its subagent tree. The rate holds steady between cost changes and jumps to a fresh, tighter window when new cost is observed; it does not decay toward zero while the session is idle.

**Active rate** — total cost divided by time the session was actually doing work:

`(total USD cost) / active-elapsed * 3_600_000`

The active-elapsed window is the union of every span where the assistant was generating a message or a tool call was in-flight (for the root session), plus the `[created, updated]` window for each subagent session. Idle gaps between activity bursts are excluded automatically.

## Limits

The subagent tree walk is capped at depth 5 and 100 total sessions. Deeper or wider trees are silently truncated. The plugin requires an opencode version whose server exposes `GET /session/:id/children` and `GET /session/:id/messages` (roughly >= 1.18).

Subagent active time uses the session's `[created, updated]` window rather than detailed message activity. When opencode's experimental backgrounded-subagent feature detaches a subagent to keep running after the parent tool call returns, this coarse window may under- or over-count that subagent's active time.

## Local development

```sh
bun install
bun run check
bun run build
```

The build must run first so `dist/tui.js` exists. Point `tui.json` at the built entry file for a smoke test:

```json
{
  "plugin": ["./path/to/burn-rate/dist/tui.js"]
}
```

## Releasing

Releases are tag-driven. Run `bun run patch` (or `minor` / `major`) to bump the version, commit, tag `vX.Y.Z`, and push the branch and tag to origin. CI then publishes to npm and creates a GitHub release with generated notes.

## License

MIT
