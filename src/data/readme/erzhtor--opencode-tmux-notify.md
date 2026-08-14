# opencode-tmux-notify

Shows OpenCode agent activity status in your tmux window name — without overwriting it.

Instead of replacing the window name, this plugin **prepends** a status icon:

![demo](demo.gif)

## Install

```sh
opencode plugin @erzhtor/opencode-tmux-notify --global
```

Or add to `opencode.json`:

```json
{ "plugin": ["@erzhtor/opencode-tmux-notify"] }
```

## Configure

```ts
type Options {
  working?: string | { spinner: string; spinMs?: number }
  waiting?: string | { icon: string }
  error?:   string | { icon: string; clearMs?: number | "never" }
  done?:    string | { icon: string; clearMs?: number | "never" }
}
```

- **`working`** — string for static icon, or `{ spinner, spinMs }` for animation. Default: heavy braille spinner at 80ms.
- **`waiting`** — icon when agent is blocked waiting for your input (e.g. asking a question). Default: `⚠`. Always persists until the agent resumes.
- **`error`** — icon when agent encounters an error. Default: `✘`, persists by default.
- **`done`** — icon when agent finishes. Default: `✔` with 5000ms auto-clear.
- **`clearMs: "never"`** — keep the icon until the next state (for `error` and `done` only). Omitting `clearMs` defaults to `"never"` for `error`, and `5000` for `done`.

### Examples

Use defaults:

```jsonc
{ "plugin": ["@erzhtor/opencode-tmux-notify"] }
```

Static icons + persist done forever:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": "⏳", "done": "✅" }]
```

Custom spinner + flash error:

```jsonc
["@erzhtor/opencode-tmux-notify", {
  "working": { "spinner": "◐◓◑◒", "spinMs": 120 },
  "done":    { "icon": "✓", "clearMs": 10000 },
  "error":   { "icon": "⚠", "clearMs": 5000 }
}]
```

Disable waiting/error:

```jsonc
["@erzhtor/opencode-tmux-notify", {
  "waiting": null,
  "error": null
}]
```

### Spinner presets

braille — dots walking around:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏" } }]
```

heavy braille *(default)* — denser 8-dot pattern:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "⣷⣯⣟⡿⢿⣻⣽⣾" } }]
```

arcs — crescent rotations:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "◜◠◝◞◡◟" } }]
```

half-circles — rotating circle fills:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "◐◓◑◒" } }]
```

quadrant squares — corner fills rotating:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "◰◳◲◱" } }]
```

quadrant circles — quadrant fills rotating:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "◴◷◶◵" } }]
```

quadrant blocks — block fills rotating:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "▖▘▝▗" } }]
```

triangles — corners rotating:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "◢◣◤◥" } }]
```

block pulse — growing/shrinking bar:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "▁▂▃▄▅▆▇█▇▆▅▄▃▂" } }]
```

arrows — compass cycle:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "←↖↑↗→↘↓↙" } }]
```

classic ascii — universal:

```jsonc
["@erzhtor/opencode-tmux-notify", { "working": { "spinner": "|/-\\" } }]
```

## How it works

| State   | Icon | Trigger                          |
| ------- | ---- | -------------------------------- |
| Working | ⣷    | Agent starts generating a response |
| Waiting | ⚠    | Agent needs your input (question, permission) |
| Error   | ✘    | Agent encounters an error |
| Done    | ✔    | Session becomes idle |
| Clean   | —    | After `clearMs` timeout, or on exit |

- **Multi-instance safe**: Uses `$TMUX_PANE` with `-t` targeting — each OpenCode instance only modifies its own window
- **No-op outside tmux**: Silently returns if `$TMUX_PANE` is not set
- **No shell injection**: Uses `execFileSync` (no shell interpolation)
- **Exit cleanup**: Strips the icon when OpenCode exits
- **Debounced**: Only sets the working icon once per agent turn
- **State priority**: `waiting` > `error` > `done` — a blocked agent isn't truly idle
