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
| `notifyQuestions` | `true` | `askuserquestion` / `question.asked` |
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

The `@opencode-ai/plugin@1.18.21` promise `PluginContext` stubs `ctx.event` and `setup` cleanup, so the plugin uses a typed `EventContext` bridge + `as unknown as Parameters<typeof define>[0]` cast, and forwards server events through `handleEvent`/`consumeEvents` when `ctx.event.subscribe` is present.

Notification titles are **best-effort**: the per-session name is derived from the session `directory` when available, falling back to the config default (`"opencode"`). They are **not** taken from `process.cwd()`.

V2 question events: `question.asked` / `question.v2.asked` notify once and retract on `question.replied` / `question.v2.replied` / `question.rejected` / `question.v2.rejected`. The `askuserquestion` tool-part fallback still reads `part.state.input`.

Permission bodies use `action` + `resources` (legacy `permission` + `patterns` still accepted).

Pin the SDK version; expect churn.

## License

[MIT](./LICENSE)
