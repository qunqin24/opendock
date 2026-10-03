# opencode-cmux-status

[![npm version](https://img.shields.io/npm/v/opencode-cmux-status?style=flat-square)](https://www.npmjs.com/package/opencode-cmux-status)

OpenCode **2.x** plugin that surfaces agent activity in the **cmux** sidebar:

- a status pill per project (`working`, `waiting`, `done`, `error`, `idle`)
- a workspace progress bar (time-based estimate while working, 100% on done)
- sidebar log lines on state changes
- cmux notifications when input is needed, a run fails, or a turn finishes

> **Fork of [`4m1z/opencode-tmux-session-status`](https://github.com/4m1z/opencode-tmux-session-status) (MIT).**
> The state machine, V2 event decoding and hook wiring are upstream; the tmux
> adapter was replaced with a cmux backend, and the plugin now tracks only the
> project location it was loaded for. See [CHANGELOG.md](CHANGELOG.md).

## Requirements

- OpenCode 2 (`@opencode/plugin` `^2.0.0`)
- [cmux](https://cmux.dev/) installed and on `PATH`
- `CMUX_WORKSPACE_ID` present in the OpenCode server environment (it is when
  OpenCode is started from a cmux-managed terminal)

Outside cmux the plugin is a no-op. There is no tmux dependency.

## Install

### npm

```sh
opencode plugin add opencode-cmux-status
```

or in `opencode.json` / `opencode.jsonc`:

```jsonc
{
  "plugins": ["opencode-cmux-status"],
}
```

### From a local checkout

OpenCode 2.0.18 cannot install `github:` plugin specs
(`NpmInstallFailedError: git dep preparation failed`); the same failure
happens with the upstream package, so it is an OpenCode-side issue. Until it
is fixed, install from a local checkout:

```sh
git clone https://github.com/daropotter/opencode-cmux-status \
  ~/.config/opencode/plugins/opencode-cmux-status
```

Then create `~/.config/opencode/plugins/opencode-cmux-status.js`:

```js
export { default } from "./opencode-cmux-status/src/index.ts";
```

OpenCode auto-discovers direct `.js` / `.ts` files in
`~/.config/opencode/plugins/`. Update later with:

```sh
git -C ~/.config/opencode/plugins/opencode-cmux-status pull
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-cmux-status",
      "options": {
        "bin": "cmux", // cmux executable (default: $OPENCODE_CMUX_BIN or "cmux")
        "workspace": "6F707E24-...", // default: $CMUX_WORKSPACE_ID
        "statusKeyPrefix": "opencode-", // prefix for per-project status keys
        "notifications": true,
        "notificationCooldownMs": 120000,
        "changedDetailFloorMs": 15000,
        "notificationDetail": "full", // "state" hides details in notifications
        "progress": true,
        "logs": true,
        "debug": false, // rate-limited diagnostics on stderr
      },
    },
  ],
}
```

## State model

| State     | Meaning                                        |
| --------- | ---------------------------------------------- |
| `working` | agent is actively running                      |
| `waiting` | permission request or open question            |
| `done`    | turn finished (persists until the next prompt) |
| `error`   | run failed / question rejected                 |
| `idle`    | session created, no work outstanding           |

Transitions come from OpenCode 2 events (`session.status`, `session.idle`,
`session.error`, `permission.*`, `question.*` / `form.*`, tool hooks, prompt
hooks) with the upstream state machine. Status pills are keyed per project
directory (`<statusKeyPrefix>` + first 8 hex chars of SHA-1 of the directory),
so multiple projects in one cmux workspace keep separate pills. Progress and
notifications are workspace-level cmux resources.

## Differences from upstream

- **cmux output backend** (`set-status`, `set-progress`, `log`, `notify`)
  instead of tmux window options and `omarchy`/`notify-send`.
- **Per-location tracking** — OpenCode instantiates a plugin per project
  location while every instance sees the whole server event stream; this fork
  ignores events that do not belong to its own location, so statuses, logs and
  notifications are written once.
- **Stable project keys** — SHA-1 of the directory instead of a `cksum` hash
  and tmux session name.
- **No acknowledgement flow** — there is no tmux `ack.sh`; `done` stays visible
  until the next prompt starts.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build
```

## License

MIT. Original work Copyright (c) 2026 4m1z; fork modifications
Copyright (c) 2026 daropotter. See [LICENSE](LICENSE).
