# OpenCode session surf

Session list sidebar plugin for [opencode](https://opencode.ai) TUI. Shows all
sessions from the local opencode database, with live status (busy/waiting)
synced across opencode instances, plus quick session switching.

## Features

- **Sidebar session list** — all sessions, grouped by recency, with project
  directory and relative update time
- **Cross-instance status sync** — each opencode process broadcasts session
  statuses (busy/waiting) to a temp-dir status file; other instances pick them
  up so you can see when a session is active elsewhere
- **Ctrl+O fuzzy picker** — fuzzy-search sessions by title or directory and
  switch instantly; close matches are ordered by recency, most recent on top.
  Arrow keys or `ctrl+j`/`ctrl+k` move the highlight (wrapping at both ends),
  which stays centred as the list scrolls; long names are truncated with `…`
- **Rename / delete / fork from the picker** — act on the highlighted session
  without leaving the popup (rename applies instantly)
- **Compact or comfortable rows** — one line, or two lines per session, via the
  `density` option
- **Configurable look** — spinner, waiting indicator, and marker glyph styles,
  or a whole `preset`; all keybinds are rebindable
- **Next/previous session** commands for quick navigation

## Install

From npm (published version):

```json
{
  "plugin": [
    "opencode-session-surf"
  ]
}
```

From the GitHub repo:

```json
{
  "plugin": [
    "https://github.com/luchev/opencode-session-surf"
  ]
}
```

From a local checkout:

```json
{
  "plugin": [
    "file:///path/to/opencode-session-surf/index.tsx"
  ]
}
```

Requires opencode with TUI plugin support and `bun`.

## Configuration

Plugin options are set through the `plugin` array in `tui.json` (tuple form):

```json
{
  "plugin": [
    ["opencode-session-surf", { "spinner": "dots" }]
  ]
}
```

### Options

| Option | Values | Default | Description |
|---|---|---|---|
| `spinner` | `dots`, `arc`, `sweep`, `fill`, `bounce`, `sparkle`, `block`, `battery`, `gauge`, `speed`, `none`, `""` | `dots` | Working spinner style; `none` renders a blank cell, `""` hides it |
| `waiting` | `emoji`, `ellipsis`, `question`, `pulse`, `block`, `bounce`, `eyeblink`, `bell`, `help`, `bulb`, `ghost`, `none`, `""` | `pulse` | Waiting-for-input indicator; `none` renders a blank cell, `""` hides it |
| `marker` | `dot`, `square`, `arrow`, `star`, `none`, `caret`, `ping`, `creation`, `sprout` | `dot` | Active-session marker glyph |
| `preset` | `ping`, `term`, `braille`, `hex`, `moon`, `pie` | — | Predefined look that overrides `spinner`/`waiting`/`marker` (see below) |
| `pollMs` | number (ms) | `3000` | Sidebar refresh interval; values below 1000 are ignored |
| `openElsewhere` | boolean | `false` | Show a `•` dot on sessions open in another opencode instance |
| `density` | `compact`, `comfortable` | `comfortable` | Session manager picker row layout: `compact` puts name + age + dir on one line; `comfortable` uses two lines (name, then age left / dir right) |
| `debug` | boolean | `false` | Append diagnostics to `$TMPDIR/opencode-session-surf-status/debug.log` |

Some symbols (`battery`, `gauge`, `speed`, `eyeblink`, `bell`, `help`, `bulb`,
`ghost`, `creation`, `sprout`, and the `ping`, `hex`, and `moon` presets) are
Nerd Font glyphs and require a [patched Nerd Font](https://www.nerdfonts.com/)
installed in your terminal — without one they render as boxes or nothing.

With `openElsewhere` enabled, sessions running in another opencode instance show a `•` marker;
the active-session glyph stays visible even while its spinner is running. The sidebar is split into two
sections, each collapsible on click via the `▼`/`▶` toggle:

- **`preset: "ping"`** — a predefined look that ignores the individual
  `spinner`/`waiting`/`marker` options: the current session shows `◉` (ping),
  waiting uses the `bell` style, working uses the `arc` spinner, and idle
  Active sessions show a `•` dot. The marker and spinner share one cell, so
  the current glyph replaces the spinner instead of sitting next to it, and
  no column is reserved for each separately.

- **`preset: "term"`** — pure ASCII, works in any terminal: `>` for the
  current session, `...` while waiting, `-\|/` while working. Also combined.

- **`preset: "braille"`** — `●` marker, `⣾⣿` pulse while waiting, braille
  dots while working. Keeps the marker and spinner in separate cells.

- **`preset: "hex"`** — hexagon theme: hexagon marker, hexagon/outline blink
  while waiting, hexagon slices filling and draining while working. Combined.

- **`preset: "moon"`** — lunar theme: new-moon marker, full/new moon blink
  while waiting, the full 28-phase moon cycle (new → full → new) while
  working. Combined.

- **`preset: "pie"`** — progress-pie theme: full-slice marker, slice/full
  blink while waiting, circle slices filling and draining while working.
  Combined.

- **Active** — the session you're in, plus anything busy, waiting, or updated
  in the last 15 minutes. Idle rows in Active are green; no Active session
  renders white.
- **Recent** — the last 24 hours of work, plus the previous block of work
  before it (so a quiet gap, like a weekend, doesn't hide the last real batch
  of sessions). Rows are white, as usual.

Keybinds are configured through `tui.json`'s `keybinds` map, keyed by command
name (custom keybinds are additive to the defaults):

### Keybinds

| Action | Default | Command |
|---|---|---|
| Open session picker | `ctrl+o` | `session_surf.picker.open` |
| Next session | `ctrl+x j` | `session_surf.next` |
| Previous session | `ctrl+x k` | `session_surf.previous` |
| Move session into a directory | `ctrl+x w` | `session_surf.chdir` |

The picker itself has its own actions, also configurable through the same
`keybinds` map and shown at the bottom of the popup:

| Picker action | Default | Command |
|---|---|---|
| Switch to selected session | `enter` | `session_surf.picker.switch` |
| Move selection up | `↑`, `ctrl+k` | `session_surf.picker.up` |
| Move selection down | `↓`, `ctrl+j` | `session_surf.picker.down` |
| Rename selected session | `ctrl+r` | `session_surf.picker.rename` |
| Delete selected session | `ctrl+d` | `session_surf.picker.delete` |
| Fork selected session | `ctrl+f` | `session_surf.picker.fork` |
| Move selected session | `ctrl+w` | `session_surf.picker.move` |
| New session | `ctrl+n` | `session_surf.picker.new` |
| Close the picker | `esc` | `session_surf.picker.close` |

Selection wraps around both ends. Rename and delete keep the picker open (a
confirmation prompt appears first, and rename shows the new title
immediately); fork closes it and switches to the new session, which keeps the
original name the first time and gets a numbered suffix afterwards
(`name (fork 2)`, `name (fork 3)`, …); move closes it and prompts for a
directory, exactly like `ctrl+x w`. Plain letter keys always stay free for
search — only the control/arrow/enter/esc bindings above are captured while the
picker is open.

`ctrl+x w` moves the current session into a directory you type or tab-complete:
the conversation is forked into a new session whose working directory is the
one you chose, the new session keeps the original name, and the original
session is deleted. The server's fork API copies the conversation but cannot
set a directory (fork/update/import all ignore it), so after forking the
plugin writes the chosen directory straight into the new session's row in
`~/.local/share/opencode/opencode.db` — the server re-reads it from the
database on every request.

```json
{
  "keybinds": {
    "session_surf.next": "ctrl+]",
    "session_surf.previous": "ctrl+["
  }
}
```

Set a command to `"none"` to disable its keybind.

### Rebind the leader key

The leader is opencode's own setting, not this plugin's. Change it in
`tui.json`:

```json
{
  "keybinds": {
    "leader": "ctrl+space"
  }
}
```

## Development

```bash
bun install
bun run dev     # build watch → dist/index.js
bun run build   # one-shot build
bun run test    # unit + render tests (uses the @opentui/solid preload)
```

To test the plugin locally, point tui.json's `plugin` array at the local
checkout and restart opencode.

The plugin reads session data from
`~/.local/share/opencode/opencode.db` (via `bun:sqlite`).

## License

MIT
