# opencode-subagent-usage

A TUI sidebar widget for [opencode](https://opencode.ai) that shows the rolled-up
cost and token usage of the **subagent (child) sessions** a session spawned.

opencode's built-in **Context** block only reports the session it is attached to.
Anything a subagent spends never appears there, so on subagent-heavy work the
number you see can be a small fraction of what was actually billed.

```
Subagents                  <- this plugin
42 sessions · 3 running
$3.80 spent
188,204,551 tokens
Context                    <- built-in
96,410 tokens
48% used
$0.90 spent
```

In that example the session's real total was about $4.70. The built-in sidebar
showed $0.90 on its own. Real numbers vary with how much a workflow fans out;
the point is that the difference is invisible without this.

## Install

```sh
opencode plugin opencode-subagent-usage --global
```

That installs the package and registers it in `~/.config/opencode/tui.json`.
Without `--global` it installs into the current directory's `.opencode/tui.json`
instead. Restart the TUI afterwards.

Prefer to do it by hand? Add the package to the `plugin` array in
`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-subagent-usage"]
}
```

> TUI plugins belong in `tui.json`. Putting this in `opencode.json` makes the
> server-side loader look for a `server()` export that does not exist, and it
> will warn and skip the package.

## What it shows

- **sessions** - number of child sessions, counted recursively (subagents and
  any subagents they spawned). The line reads `N running` when one or more
  children are currently busy.
- **spent** - summed `cost` across all of those child sessions.
- **tokens** - summed input, output, reasoning, and cache read/write tokens.

The block hides itself when a session has no subagents.

The figures are **additive with Context, not inclusive**. Context is the session
you are viewing; Subagents is everything it spawned. Add them for the true
session total.

Token counts follow the same definition the built-in Context widget uses, which
includes cache reads. On long sessions cache reads usually dominate, so the
token number can look much larger than the raw conversation size.

## How it works

For the session currently displayed in the sidebar, it calls
`client.session.children({ sessionID })`, sums each child's `cost` and `tokens`,
then recurses into each child. Data refreshes every 2 seconds and on
`session.status` / `session.updated` events. A `seen` set guards against cycles.

No network calls are made beyond opencode's own local API client. Nothing is
written to disk, nothing is sent anywhere, and no session data leaves your
machine.

### Why the source is plain JS

`src/subagent-usage.js` is hand-written, not compiled from JSX, and that is
deliberate. opencode loads published plugins from inside `node_modules`, and its
bundled Bun runtime does not apply the JSX transform to files there, so a
shipped `.tsx` is never executed - it fails silently and the plugin simply never
appears. Building the JSX ahead of time does not solve it either: the common
compilers either emit the *dev* JSX runtime, or flatten JSX props eagerly and
drop Solid's reactivity. So the file is written directly in the shape a
Solid-aware compiler would produce: `jsx`/`jsxs` from the production runtime,
with getters on every prop that reads reactive state.

The practical consequence is that this package has no build step and no
runtime dependencies other than the `solid-js` and `@opentui/solid` the host
already provides.

## Requirements

- opencode `>= 1.18.31` (the version verified to expose the TUI plugin slot API)
- A model provider that reports cost, for the `spent` figure to be meaningful

## Tuning

Two constants at the top of `src/subagent-usage.js`:

- `POLL_MS` - refresh interval, default `2000`
- `order` in the `slots.register` call - default `90`, which places the block
  directly above the built-in Context block (`100`)

## Notes

- Costs come from opencode's own session records. A sum computed against the
  raw database can differ slightly (well under a percent) because the two are
  read at different moments.
- If you want the upstream fix rather than a plugin, see
  [anomalyco/opencode#45417](https://github.com/anomalyco/opencode/issues/45417)
  (session cost excludes subagent cost) and
  [#47822](https://github.com/anomalyco/opencode/issues/47822) /
  [#48548](https://github.com/anomalyco/opencode/issues/48548).

## Not affiliated

This project is not built by the opencode team and is not affiliated with it in
any way. "opencode" is used only to describe what it plugs into.

## License

MIT
