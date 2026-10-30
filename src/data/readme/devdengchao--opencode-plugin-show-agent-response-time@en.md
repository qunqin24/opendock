# OpenCode Agent Response Time

Hover the duration at the bottom of an agent response in OpenCode Desktop to see the exact completion time of that turn.

<p align="center">
  <img src="https://raw.githubusercontent.com/DevDengChao/opencode-plugin-show-agent-response-time/main/docs/preview.jpg" alt="Hover an agent response duration to see its completion time" width="900">
</p>

<p align="center">
  <sub>Hover the duration at the bottom of an agent response to see the exact completion time, using the same tooltip as user message timestamps.</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@devdengchao/opencode-plugin-show-agent-response-time">
    <img alt="npm" src="https://img.shields.io/npm/v/@devdengchao/opencode-plugin-show-agent-response-time">
  </a>
  <a href="https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/actions/workflows/ci.yml/badge.svg">
  </a>
  <img alt="OpenCode Desktop" src="https://img.shields.io/badge/OpenCode%20Desktop-2.2.x-111">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

<p align="center">
  <a href="./README.md">简体中文</a> · <a href="./README.en.md"><strong>English</strong></a>
</p>

OpenCode already shows the duration of each completed agent response, for example `4m 46s`. This plugin makes that duration hoverable and shows the full timestamp with the same tooltip used by user message timestamps:

```text
Friday, October 30, 2026 at 12:46:42 AM GMT+8
```

The tooltip shows when the turn **completed**, matching the end of the displayed duration.

## Features

- **Hover to inspect**: rest the pointer on the response duration to see the exact date, time zone and seconds
- **Native appearance**: reuses OpenCode's compact tooltip styling and follows light/dark themes
- **Locale-aware**: uses `Intl.DateTimeFormat` with the current interface locale, exactly like user message timestamps
- **Turn-accurate**: reads the latest assistant `time.completed` for that turn from the current session
- **No layout change**: only adds hover behavior to the duration item
- **Self-cleaning**: restores everything after virtual scrolling, re-renders, session switches or plugin reloads
- **Read-only**: never changes Markdown, message content, the database or other clients

## Quick start

### Requirements

- OpenCode Desktop **2.2.x** (developed and verified on 2.2.1)
- No extra Node.js installation is needed when installing from npm
- Node.js **20.19+** and npm when building from source
- OpenCode Desktop on Windows, macOS or Linux

### Install from npm (recommended)

Package name:

```text
@devdengchao/opencode-plugin-show-agent-response-time
```

Add the plugin to `~/.config/opencode/opencode.jsonc` (on Windows usually
`C:\Users\<name>\.config\opencode\opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-show-agent-response-time"
  ]
}
```

To pin a version:

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-show-agent-response-time@0.1.0"
]
```

OpenCode installs and loads the package from npm; cloning or building is not required.

If the GUI does not reload, restart Desktop or check that
`opencode-plugin-show-agent-response-time` is enabled under **Settings > Extensions > Plugins**.

### Install from source (development)

```bash
git clone git@github.com:DevDengChao/opencode-plugin-show-agent-response-time.git
cd opencode-plugin-show-agent-response-time
npm install
npm run build
```

The GUI bundle is `dist/gui.cjs`. Add the local plugin to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///E:/my/open-source/opencode-plugin-show-agent-response-time"
  ]
}
```

Use the absolute path on your machine. On macOS/Linux:

```jsonc
"plugins": [
  "file:///Users/you/opencode-plugin-show-agent-response-time"
]
```

Restart OpenCode Desktop after saving. **Settings > Extensions > Plugins** should list the plugin as enabled.

### Debugging

Use the object form to enable renderer logs:

```jsonc
{
  "plugins": [
    {
      "package": "file:///E:/my/open-source/opencode-plugin-show-agent-response-time",
      "options": {
        "debug": true
      }
    }
  ]
}
```

Logs are prefixed with `[agent-response-time]`.

## Usage

1. Open a session with a completed agent response.
2. Hover the response; its footer shows `Build · model · duration`.
3. Rest the pointer on the duration (for example `4m 46s`).
4. After about 800ms, the exact completion timestamp appears.
5. The format matches the tooltip shown when hovering a user message timestamp.

No tooltip appears while a response is still streaming, when an interrupted response has no completion time, or before the message data has loaded.

## Compatibility

- Verified with **OpenCode Desktop 2.2.1**
- Uses the Desktop GUI plugin API, which is still **experimental**
- Enhances assistant response footers in the session timeline only
- **No TUI support**: the TUI has no equivalent message-footer extension point

> If OpenCode changes the timeline DOM, this plugin may need an update. The selectors live at the
> top of `src/response-time.ts`.

## How it works

OpenCode Desktop renders each assistant response with a structure like:

```html
<div data-message-id="msg_user_xxx">
  <div data-component="text-part" data-timeline-part-id="part_text_xxx">
    <div data-slot="text-part-body">...</div>
    <div data-slot="text-part-copy-wrapper">
      <button>Copy</button>
      <span data-slot="text-part-meta">
        <span data-slot="text-part-meta-item">Build</span>
        ...
        <span data-slot="text-part-meta-item">4m 46s</span>
      </span>
    </div>
  </div>
</div>
```

The plugin watches `[data-slot="session-timeline-scroll"]` with a `MutationObserver`, marks the duration item, and on hover reads the current session's synced messages:

```ts
ctx.sessions.current()?.server.data.session.message.list(session.id)
```

It finds the matching user message and uses the latest assistant `time.completed` in that turn. The timestamp is then rendered in the same tooltip structure OpenCode uses for user message timestamps. The plugin only changes the page's hover display; it never writes session data.

## Development

```bash
npm run demo       # standalone browser demo at http://localhost:5173
npm run typecheck  # TypeScript check
npm run test       # jsdom unit tests
npm run build      # builds dist/gui.cjs
npm run dev        # watch build
```

For local debugging, point `plugins` at this project directory. Rebuild (or keep `npm run dev` running) after source changes.

### File layout

```text
src/
├─ index.ts          # server entry: plugin id and load log
├─ gui.ts            # GUI entry: styles and response-time installer
├─ response-time.ts  # timeline scan, duration detection, tooltip and cleanup
├─ session-time.ts   # turn completion timestamp from session messages
├─ format-time.ts    # full timestamp formatter shared with user messages
└─ styles.css        # hover state and tooltip fallback styles
demo/                # browser demo
tests/               # jsdom unit tests
```

## FAQ

### Nothing appears on hover

Check that:

1. OpenCode Desktop is 2.2.x.
2. The plugin is enabled under **Settings > Extensions > Plugins**.
3. The response has completed; streaming responses have no completion time.
4. You are hovering the **duration**, not the model name or copy button.
5. For a local source install, `npm run build` has produced `dist/gui.cjs`.
6. Renderer logs contain `[agent-response-time]` after enabling `debug`.

### Why does the timestamp not equal the duration?

The tooltip shows the latest assistant `time.completed` for the turn. The footer duration is that same completion time minus the user message's `time.created`. They describe the same endpoint.

### Does it change the session?

No. It only reads already-synced message data and changes the page's hover display. Markdown, the database and other clients are untouched.

### Does it support the TUI?

No. The TUI has no message-footer extension point.

## Known limitations

- Enhances only the session timeline, not settings pages, sidebars or other views.
- Depends on OpenCode Desktop's current DOM; upgrades may require selector updates.
- Mouse hover and keyboard focus only; no touch long-press support yet.
- Requires a completed response with `time.completed`.
- Timestamp formatting follows the system/browser time zone and the interface locale.

## Contributing

Issues and pull requests are welcome.

- [Issues](https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/issues)
- [Changelog](./CHANGELOG.md)
- [中文 README](./README.md)

## License

[MIT](./LICENSE) © 2026 DevDengChao
