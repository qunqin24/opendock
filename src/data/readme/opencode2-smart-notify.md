# opencode2-smart-notify — Desktop notifications for OpenCode V2

Desktop notifications for **Beta OpenCode 2 (`opencode2`) only**. This package does **not** load in mainline `opencode` (V1).

`--auto` and **Enable auto-approve permissions** still emit permission events. Other notifiers pop on every ask. This plugin waits a short settle window and only notifies if the request is still waiting.

## Install

Add a `plugins` array entry in `opencode.json` / `opencode.jsonc`:

```jsonc
{
  "plugins": ["opencode2-smart-notify"]
}
```

With options (delivered as `ctx.options`):

```jsonc
{
  "plugins": [
    { "package": "opencode2-smart-notify", "options": { "notifyErrors": false } }
  ]
}
```

Or:

```sh
opencode2 plugin add opencode2-smart-notify
```

Auto-discovery dirs also work: `.opencode/plugins/` and `~/.config/opencode/plugins/`.

Do not copy only `src/index.ts` into a plugins directory — the plugin is several files.

## Config

Precedence: defaults < `~/.config/opencode/opencode-smart-notify.json` < `ctx.options`.

| Option | Default | Meaning |
| --- | --- | --- |
| `settleMs` | `250` | Wait this long before a permission popup |
| `notifyRequests` | `true` | Permission requests |
| `notifyQuestions` | `true` | `askuserquestion` |
| `notifyErrors` | `true` | Session errors (not cancel) |
| `notifyIdle` | `true` | Agent finished (`session.status` idle) |
| `notifySubagents` | `false` | Task / child-session events |
| `urgency` | `"critical"` | `low`, `normal`, or `critical` |
| `clickCommand` | *(auto)* | Argv run on click. `{sessionId}` is substituted. Default: focus Zed if running, else focus OpenCode TUI |

## Requirements

- **Beta OpenCode 2 (`opencode2`)** — not mainline `opencode`
- Linux: `notify-send` on `PATH` (`libnotify-bin` on Debian/Ubuntu)
- macOS: Notification Center via `osascript` (built in)
- Windows 10/11: inbox `powershell.exe` (Windows PowerShell 5.1). No extra PowerShell install.

## Migrating from `opencode-smart-notify` (V1)

V1 plugins do not load in OpenCode V2 / beta `opencode2`. Remove the V1 `plugin` entry and add this `plugins` entry. This is a new package with a new plugin id (`opencode2-smart-notify`).

## Beta caveat

The verified `@opencode-ai/plugin@1.18.18` promise `PluginContext` does **not** expose a server-event bus (no `ctx.event`), so in this installed beta the plugin applies configuration and is structured to forward events through a `wireEvents` adapter, but will **not emit notifications** until the beta exposes a server-event subscription.

The engine already handles the V2 event names (`session.created` / `updated` / `deleted`, `message.updated`, `message.part.updated`, `permission.asked` + `permission.v2.asked`, `permission.updated` [v1 alias], `permission.replied` + `permission.v2.replied`, `session.error` / `idle` / `status`) with `.N` suffix stripping.

Pin the SDK version; expect churn.

## License

[MIT](./LICENSE)
