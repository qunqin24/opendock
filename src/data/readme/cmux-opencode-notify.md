# cmux OpenCode Notify

OpenCode notifications and activity status for [cmux](https://cmux.com), modeled after `@warp-dot-dev/opencode-warp`.

## Behavior

- Shows the latest response when a primary agent finishes.
- Alerts when OpenCode remains blocked on a permission request or asks a question.
- Shows `Ready`, `Working`, tool activity, and attention states in the cmux workspace status pill.
- Associates notifications with the cmux surface that launched OpenCode.
- Suppresses notifications from subagent sessions.
- Ignores cmux command failures so notifications cannot interrupt an agent turn.

cmux suppresses desktop banners while its window or the target workspace is focused. Notifications still appear in its notification panel.

## Installation

Add the npm package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["cmux-opencode-notify"]
}
```

OpenCode installs npm plugins automatically. Restart OpenCode after changing its configuration. The plugin activates only when `CMUX_SURFACE_ID` is present.

## Local Development

Clone the repository and install its dependencies:

```bash
git clone https://github.com/lucaspevidor/cmux-opencode-notify.git
cd cmux-opencode-notify
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

To load the local build instead of the npm package, use its file URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///Users/you/repos/node/cmux-opencode-notify/dist/index.js"
  ]
}
```

Set `CMUX_OPENCODE_NOTIFY_BIN` if the `cmux` executable is not on `PATH`:

```bash
export CMUX_OPENCODE_NOTIFY_BIN=/Applications/cmux.app/Contents/Resources/bin/cmux
```

## Events

| OpenCode event | cmux behavior |
| --- | --- |
| `session.created` | Sets the workspace status to `Ready` |
| `chat.message` | Sets the workspace status to `Working` |
| `tool.execute.after` | Shows the latest tool in the workspace status |
| `session.status` (`busy` to `idle`) | Clears status and sends a completion notification |
| `permission.updated` / `permission.asked` | Sends a permission notification |
| `question` tool | Sends an input-required notification |

## License

MIT. Inspired by [`@warp-dot-dev/opencode-warp`](https://github.com/warpdotdev/opencode-warp). See [Third-Party Notices](THIRD_PARTY_NOTICES.md).
