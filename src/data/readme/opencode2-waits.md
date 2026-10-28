# opencode-schedule

[![CI](https://github.com/davidprokopec/opencode-schedule/actions/workflows/ci.yml/badge.svg)](https://github.com/davidprokopec/opencode-schedule/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-schedule)](https://www.npmjs.com/package/opencode-schedule)
[![license](https://img.shields.io/npm/l/opencode-schedule)](LICENSE)

Defer a prompt in [OpenCode V2](https://opencode.ai/v2/docs/). Say what you want
and when you want it, and OpenCode sends it to itself later.

```
/schedule 1hour implement this
/schedule 60s run the test suite again
/schedule 2h30m check whether the deploy settled
```

`/schedule` returns straight away. Nothing runs, no context is held open, and no
tokens are burned while the timer is pending. When the delay elapses the plugin
submits the prompt text into the same session as an ordinary user prompt, and
OpenCode acts on it exactly as if you had typed it yourself.

Previously published as `opencode-waits` and `opencode2-waits`. To migrate,
replace the old package entry with `opencode-schedule` in `opencode.json(c)`
and remove any old waits entry from `cli.json`. Do not load both packages.
Existing pending schedules and `/wait` commands remain compatible; duration
syntax and behavior are unchanged. The original data directory and internal
plugin identity are retained, so OpenCode may still list the internal ID as
`opencode2-waits`.

## Install

Install globally with OpenCode's plugin manager:

```sh
opencode plugin add opencode-schedule
```

Or add the package to `plugins` in `opencode.json(c)`. One entry loads the
server and TUI parts. Desktop loads the experimental GUI part from the global
configuration:

```jsonc
// ~/.config/opencode/opencode.json(c)
{
  "plugins": ["opencode-schedule"],
}
```

No separate entry in `cli.json` is needed. The server owns the timers,
so closing the TUI or Desktop window does not cancel pending schedules.

With options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-schedule",
      "options": {
        "delivery": "queue",
      },
    },
  ],
}
```

| Option     | Values              | Default | Behaviour                                                                             |
| ---------- | ------------------- | ------- | ------------------------------------------------------------------------------------- |
| `delivery` | `"queue"`, `"steer"` | `queue` | `queue` waits for any turn in progress to finish. `steer` injects into the running turn. |

### Compatibility

This release is built and verified against the released
`@opencode/plugin@2.2.0` API and OpenCode `2.2.0` (OpenTUI `0.7.0`, Effect `4.0.1`).

Releases are published to npm `latest`, so the plain package name installs
the current stable version.

## Commands

The TUI sidebar shows pending prompts in an expanded Schedules section. Click
its header to collapse or expand it; click a schedule to open its actions.

### Desktop (experimental)

Open a session and click **Schedules** in the side-panel toolbar, or choose
**Schedules** from the side panel's **+ / New tab** launcher. You can also
choose **Open Schedules** in the command palette or use `/schedule-list`.
Schedule a prompt with a delay, view pending schedules and their countdowns,
or cancel one or all schedules in the current session. `/schedule` and
`/schedule-cancel` also run locally without a model call.

The GUI API is experimental and targets OpenCode Desktop 2.2.0. Browser/web-app
plugin loading has not been verified. The Desktop panel currently supports
scheduling, listing and cancellation; the TUI's edit, reschedule and send-now
actions are not part of this GUI version.

OpenCode 2.2.0 may show both server fallback and GUI entries in slash
suggestions. Typing `/schedule`, `/schedule-list` or `/schedule-cancel` and submitting
directly uses the local GUI handler; the server entries remain available for
clients without GUI support.

### Slash commands

| Command                 | Effect                                                     |
| ----------------------- | ---------------------------------------------------------- |
| `/schedule <duration> <prompt>` | Schedule `<prompt>` for delivery after `<duration>`. |
| `/schedule-list`        | Show pending scheduled prompts.                             |
| `/schedule-cancel <id>` | Cancel one schedule, e.g. `/schedule-cancel w1`.              |
| `/schedule-cancel all`  | Cancel every schedule pending in this session.               |

The old `/wait`, `/wait-list`, `/wait-cancel` commands remain compatibility
aliases with the same arguments. Cancellation is scoped to the current
session. Desktop lists schedules for the current session; the TUI manager
also groups schedules from other sessions as before.

## Durations

`<duration>` is the first whitespace-separated argument; everything after it is
the prompt.

| Form            | Meaning              |
| --------------- | -------------------- |
| `500ms`         | milliseconds         |
| `60s`, `90 sec` | seconds              |
| `5m`, `5min`    | minutes              |
| `1h`, `1hour`   | hours                |
| `3d`, `3 days`  | days                 |
| `1w`            | weeks                |
| `2h30m`         | compound             |
| `1.5h`          | fractional           |
| `60`            | bare number, seconds |

`m` is minutes and `ms` is milliseconds. A bare number is only accepted on its
own, so `1h30` is rejected as ambiguous rather than guessed at. The maximum is
30 days.

## Schedules survive restarts

Each pending schedule is a JSON file under
`$XDG_DATA_HOME/opencode-waits/waits/` (the legacy-compatible directory, with one file per
wait, so the two halves never clobber each other's records). On startup the
server half arms everything it finds, and fires anything already overdue
immediately.

Rate limits at fire time are OpenCode's job, not the plugin's: submitting the
prompt succeeds even while limited, and OpenCode retries the model call itself
with backoff, honouring retry-after. Even if that fails, the prompt stays in
the session as an ordinary message. The plugin only re-arms — after 5m, 15m and
45m — when the prompt cannot be *submitted* at all, such as when the session is
busy with a conflicting operation. If the target session no longer exists, the
wait is dropped.

## How it works

A slash command defined by a *server* plugin is only a prompt template. Running
one submits a prompt and schedules model execution — so it fails exactly when
you are rate limited and most want to defer work.

A **TUI** slash command does not. The prompt matches `/schedule …` and calls the
plugin before any model dispatch, so scheduling costs no model call at all. That
is why the terminal trigger lives in the TUI part. Desktop commands call the
server's typed RPC directly, also without submitting a model prompt.

Timers cannot live there, though: they would die when you close the TUI. So the
TUI half only records the wait to disk, and the **server** half — running in the
background service — owns the timers and delivers the prompt.

The server half exposes `schedule_create`, `schedule_list` and `schedule_cancel`
as tools, with `wait_schedule`, `wait_list` and `wait_cancel` compatibility
aliases, and registers `/schedule`, `/schedule-list` and `/schedule-cancel`
(plus their `/wait` aliases) as server-side
commands. Clients without the TUI or GUI part can use these server commands;
they ask the agent to call the tool and cost one model turn. The TUI and
Desktop GUI parts provide their own model-free command handlers instead.

## Development

Requires [Bun](https://bun.sh).

Source is grouped by plugin surface:

```text
src/
  server/  # timers, commands, tools and RPC handlers
  tui/     # terminal commands, manager and sidebar
  gui/     # Desktop panel, launchers and local commands
  shared/  # contracts, durations and server/TUI persistence
```

Package exports select each surface; the GUI bundle imports only its shared
RPC contract, not filesystem or timer implementations.

```sh
bun install
bun run check   # typecheck + lint + test + GUI bundle build
```

To run it against a local checkout, install dependencies and build the GUI
bundle first, then configure the package directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-schedule"],
}
```

OpenCode does not install dependencies or build the GUI for local plugin
paths. Rebuild with `bun run build` after changing GUI code.

## License

MIT
