# @alxark/opencode-panel-apps

An [OpenCode](https://github.com/sst/opencode) TUI plugin that renders a sidebar
panel showing the output of one or more shell commands, refreshed on a
configurable interval.

## Install

```sh
npm install @alxark/opencode-panel-apps
```

Then add the plugin to your OpenCode configuration (`opencode.json` or
equivalent):

```json
{
  "plugin": ["@alxark/opencode-panel-apps"]
}
```

## Configuration

Create `opencode-panel-apps.jsonc` in your OpenCode config directory (the
plugin reads `OPENCODE_CONFIG_DIR` first, otherwise the directory containing
your active OpenCode config file):

```jsonc
{
  "apps": [
    {
      "icon": "git",
      "command": ["git", "rev-parse", "--abbrev-ref", "HEAD"],
      "period": 5000
    },
    {
      "icon": "load",
      "command": [ "uptime" ],
      "period": 10000
    }
  ]
}
```

Each entry takes:

| Field     | Type       | Notes                                                                  |
| --------- | ---------- | ---------------------------------------------------------------------- |
| `icon`    | `string`   | Required. Short label rendered before the output line.                 |
| `command` | `string[]` | Required. `argv`-style — first element is the binary, rest are args.   |
| `period`  | `number`   | Optional. Refresh interval in ms. Default `10000`, minimum `1000`.     |

## Behavior

- The command runs without a shell (`shell: false`); use `sh -c "…"` if you
  need pipes or globs.
- Each invocation has a timeout of 80 % of `period`, capped at 5000 ms.
- The first non-empty line of stdout is shown; if stdout is empty, stderr is
  used; otherwise `ok`. Output is trimmed to 80 characters.
- On non-zero exit or timeout the entry is rendered in the theme's error
  colour with an `error: …` prefix.
- A missing or invalid `opencode-panel-apps.jsonc` shows a single
  `⚠ - <reason>` line.

## License

MIT — see [LICENSE](./LICENSE).
