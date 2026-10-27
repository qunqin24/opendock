# opencode-plugin-statusline

An [OpenCode](https://opencode.ai) TUI plugin that adds a status line to the
prompt footer: how much of the context window is used, how the prompt cache
behaves, and what the session has cost.

```
2 subagents · 1 shell  |  Context: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░] 913k/1000k (91%)  |  Cache: 88% warm 4m  |  $0.20
```

## What it shows

| Segment | Meaning |
| --- | --- |
| `2 subagents · 1 shell` | Live work beside the session: subagents in the running state and shell commands started from it. Hidden when both counts are zero. |
| `Context: [bar] used/limit (pct%)` | Tokens of the latest assistant step against the model context window. The bar has 16 cells. The percent is green up to 25%, yellow up to 50%, red above. |
| `Cache: 88% warm 4m` | Share of prompt tokens the provider served from the prompt cache, plus how long the cache entry lives. `cold` means the entry expired. `--` means the model reported no cache activity. |
| `$0.20` | Total spend of the session and all its subagents, in USD. Hidden while the spend is zero. |

The line hides itself when there is nothing to show: no running work and no
assistant step with token usage yet.

## Install

Add the package to `plugins` in `opencode.jsonc`:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-plugin-statusline"]
}
```

When the TUI connects to a remote server, or when you want the plugin to load
only in the terminal, list it in `cli.json` instead:

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-plugin-statusline"]
}
```

From a local checkout, point the entry at the **directory**:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-plugin-statusline"]
}
```

A `.tsx` entry that renders JSX has to be a package: a single file path fails
with `configured plugin path must be a directory`.

## Remove the built-in usage text

OpenCode prints its own `143.7K (14%) · $0.10` in the same footer, and this
line repeats that data. Disable the built-in footer plugin in `cli.json` to
remove it:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": ["-opencode.prompt.footer"]
}
```

That plugin also owns the `tab agents` / `ctrl+p commands` hints, so those
disappear with it. Nothing else is lost: the live `N subagents · N shells`
counter is part of this line, and the host renders the directory and editor
file labels itself.

The built-in counter also jumped to the first subagent on click. This line
does not carry that click target.

## Options

Pass options in the object form of `cli.json`. Keep the object in the same
`plugins` array as the disable directive above:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    "-opencode.prompt.footer",
    {
      "package": "opencode-plugin-statusline",
      "options": {
        "cacheTtlMinutes": 5,
        "showCost": true
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `cacheTtlMinutes` | `5` | How long a prompt cache entry lives after the last step. Raise it for providers with a longer cache lifetime. |
| `showCost` | `true` | Set to `false` to hide the cost segment. |

## How it works

- The context segment reads the same assistant step the host TUI and the
  desktop app read: the latest step with token usage, after the last completed
  compaction and before the revert boundary.
- The cache share is `cache.read / (cache.read + cache.write + input)` of that
  step. The warm window starts at the completion time of the step and lasts
  `cacheTtlMinutes`.
- The cost comes from `session.cost()`. For a root session the host already
  sums the whole family, so subagent spend is included and is not counted twice.
- The line refreshes every 15 seconds and reads no credentials. It sends no
  requests and stores nothing.

## Limitations

- OpenCode does not report the provider cache TTL. The warm timer is an
  estimate from the last step and `cacheTtlMinutes`; a provider that keeps the
  cache longer than the configured TTL shows `cold` early. OpenCode sends no
  explicit TTL for Anthropic, whose default is 5 minutes.
- Provider usage allowance (rolling 5-hour and weekly windows) is not part of
  this line. OpenCode does not expose the allowance to plugins yet.
- The host prompt footer keeps its own `tokens (pct%) · cost` text unless you
  disable the built-in footer plugin; see the install section.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Nothing rendered | The session has no completed assistant step yet, or the terminal is too narrow to show the line. |
| Plugin does not load | Check `/plugins` in the TUI. The configured path must be a directory containing `package.json`. |
| `Cache: --` | The model reported no cache read or cache write on the latest step. |
| `Cache: 0% cold` | The provider reported a cache write but no read, and the warm window has passed. |

## Plugin package layout

The package follows the OpenCode v2 CLI plugin contract:

```jsonc
{
  "exports": {
    ".": "./index.ts",
    "./tui": "./tui.tsx"
  },
  "dependencies": {
    "@opencode/plugin": "latest"
  },
  "peerDependencies": {
    "@opentui/core": ">=0.6.8",
    "@opentui/solid": ">=0.6.8",
    "solid-js": ">=1.9.0"
  }
}
```

- `"."` is the server entry. It must export `{ id, setup }`. Keep it free of
  TUI imports: loading `@opentui/solid` outside the renderer fails with
  `OPENTUI_FORCE_WCWIDTH is already registered`.
- `"./tui"` is the TUI entry, built with `Plugin.define` from
  `@opencode/plugin/tui`.

## Development

```sh
npm install
npm run typecheck
npm pack --dry-run
```

OpenCode loads the TypeScript sources directly, so the package ships `index.ts`
and `tui.tsx` without a build step.

## License

[MIT](LICENSE)
