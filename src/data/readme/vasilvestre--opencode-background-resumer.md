# opencode-background-resumer

Resumes an idle OpenCode v2 session once its background subagents finish.

An orchestrator that launches subagents with `background=true` then ends its
turn is never woken to collect their results. The subagents finish and the
turn stays dead. This plugin sends the session back when the background work
drains.

```text
background-resumer: 2 background subagents finished.

Collect their results and continue the task.
```

## Install

```sh
opencode plugin add @vasilvestre/opencode-background-resumer
```

Or add it to `opencode.jsonc`:

```jsonc
{
  "plugins": ["@vasilvestre/opencode-background-resumer"]
}
```

Requires OpenCode 2. The plugin has no dependency.

## What it does

On every idle event, the plugin:

1. Looks at the `background` list on the event. It holds the items still
   running for this session, each with a `kind` and a `sessionID`.
2. While a subagent or an image still runs for this session, records that
   state and does nothing. The turn is not really over.
3. On the next idle with an empty `background`, resumes the session once with
   a message to collect the results.
4. Resumes at most once per round of background work, so it never loops on a
   session that already got its nudge.
5. Stops resuming a session after 5 resumes.
6. Does nothing while `/goal` is active on this session.

The handler never throws. A failed lookup means "no background work", not a
broken session.

## Options

```jsonc
{
  "plugins": [
    ["@vasilvestre/opencode-background-resumer", { "maxResumes": 3 }]
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `maxResumes` | `5` | How many times the plugin may resume one session |

The counter lives in the plugin's own storage, so a server restart keeps it. A
session that already used its resumes does not get more after a restart.

## Known limits

- **It keys on the idle event's `background` list.** If the subagents finish
  before the parent's idle event fires, there is no "running" state to record
  and the turn is not resumed. That race is inherent to the launch-then-stop
  pattern.
- **It reads the internal `/goal` storage key.** The key is `session:<id>` in
  OpenCode 2.2.5. If a future OpenCode renames it, the plugin no longer sees an
  active goal and resumes alongside it.
- **`/goal` and this plugin are the two resume mechanisms, and both are
  capped.** `/goal` stops at its round limit, this plugin stops at
  `maxResumes`. Running both gives two independent caps, not one.

## Test

```sh
npm test
```

## License

MIT.
